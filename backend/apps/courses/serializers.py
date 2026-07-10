from decimal import Decimal

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import (
    CourseInstructorInvitationStatus,
    CourseOfferingType,
    CourseProgramStatus,
    LessonItemType,
    OrganizationVerificationStatus,
    Role,
)
from apps.common.trust import can_organization_create_paid_course
from apps.courses.models import (
    CourseInstructorInvitation,
    CourseModule,
    CourseProgram,
    Enrollment,
    LessonItem,
)
from apps.courses.services import (
    accepted_course_instructors,
    build_course_instructor_invitation_action_url,
    calculate_progression_state,
)


class LessonItemSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(
        source="item_type",
        choices=LessonItemType.choices,
    )
    content_file_url = serializers.SerializerMethodField()
    has_content_file = serializers.SerializerMethodField()
    checklist_items = serializers.SerializerMethodField()

    class Meta:
        model = LessonItem
        fields = [
            "id",
            "title",
            "type",
            "description",
            "content_url",
            "content_file_url",
            "has_content_file",
            "checklist_items",
            "duration_minutes",
            "sort_order",
            "is_required",
            "progression_gate",
        ]
        read_only_fields = ["id"]

    def _can_view_content(self):
        return bool(self.context.get("include_lesson_content"))

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_content_file_url(self, obj):
        if not self._can_view_content() or not obj.content_file:
            return ""
        request = self.context.get("request")
        try:
            url = obj.content_file.url
        except ValueError:
            return ""
        return request.build_absolute_uri(url) if request else url

    @extend_schema_field(serializers.BooleanField())
    def get_has_content_file(self, obj):
        return bool(obj.content_file)

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_checklist_items(self, obj):
        if not self._can_view_content():
            return []
        return list(obj.checklist_items or [])

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._can_view_content():
            data["description"] = ""
            data["content_url"] = ""
            data["checklist_items"] = []
            data["content_file_url"] = ""
        return data


class LessonItemWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    type = serializers.ChoiceField(
        source="item_type",
        choices=LessonItemType.choices,
    )
    content_file = serializers.FileField(required=False, allow_null=True)
    checklist_items = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )
    upload_key = serializers.CharField(required=False, allow_blank=True, write_only=True)
    retain_existing_file = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta:
        model = LessonItem
        fields = [
            "id",
            "title",
            "type",
            "description",
            "content_url",
            "content_file",
            "checklist_items",
            "duration_minutes",
            "sort_order",
            "is_required",
            "progression_gate",
            "upload_key",
            "retain_existing_file",
        ]

    def validate_checklist_items(self, value):
        cleaned = []
        for item in value or []:
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned

    def validate(self, attrs):
        item_type = attrs.get("item_type") or getattr(self.instance, "item_type", "")
        content_url = str(attrs.get("content_url") or "").strip()
        content_file = attrs.get("content_file")
        checklist_items = attrs.get("checklist_items", [])

        if item_type == LessonItemType.VIDEO and not content_url:
            raise serializers.ValidationError({"content_url": "Video lessons need a video URL."})
        if (
            item_type == LessonItemType.RESOURCE
            and not content_file
            and not attrs.get("retain_existing_file")
        ):
            raise serializers.ValidationError({"content_file": "Document/resource lessons need an uploaded file."})
        if item_type == LessonItemType.CHECKLIST and not checklist_items:
            raise serializers.ValidationError({"checklist_items": "Checklist lessons need at least one checklist item."})
        return attrs


class CourseModuleWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    lessons = LessonItemWriteSerializer(many=True, source="lesson_items")

    class Meta:
        model = CourseModule
        fields = [
            "id",
            "title",
            "description",
            "sort_order",
            "lessons",
        ]
        read_only_fields = ["id"]


class CourseModuleSerializer(serializers.ModelSerializer):
    lessons = LessonItemSerializer(many=True, source="lesson_items")

    class Meta:
        model = CourseModule
        fields = [
            "id",
            "title",
            "description",
            "sort_order",
            "lessons",
        ]
        read_only_fields = ["id"]


class CourseProgramSummarySerializer(serializers.ModelSerializer):
    total_lessons = serializers.SerializerMethodField()
    organization_id = serializers.IntegerField(read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_verification_status = serializers.CharField(
        source="organization.verification_status",
        read_only=True,
    )
    financial_account = serializers.SerializerMethodField()
    instructor_name = serializers.SerializerMethodField()
    instructors = serializers.SerializerMethodField()

    class Meta:
        model = CourseProgram
        fields = [
            "id",
            "organization_id",
            "organization_name",
            "organization_verification_status",
            "financial_account",
            "title",
            "description",
            "category",
            "difficulty",
            "instructor_name",
            "instructors",
            "tags",
            "offering_type",
            "is_free",
            "price_amount",
            "price_currency",
            "service_credit_hours",
            "auto_issue_service_credit",
            "service_credit_title",
            "service_credit_description",
            "enrollment_open",
            "status",
            "total_lessons",
            "enrolled_count",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_total_lessons(self, obj):
        if hasattr(obj, "total_lessons"):
            return obj.total_lessons
        return sum(module.lesson_items.count() for module in obj.modules.all())

    @extend_schema_field(serializers.IntegerField())
    def get_enrolled_count(self, obj):
        if hasattr(obj, "enrolled_count"):
            return obj.enrolled_count
        return obj.enrollments.count()

    @extend_schema_field(serializers.JSONField(allow_null=True))
    def get_financial_account(self, obj):
        financial_account = getattr(obj.organization, "financial_account", None)
        if financial_account is None:
            return None

        return {
            "provider": financial_account.provider,
            "status": financial_account.status,
        }

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_instructor_name(self, obj):
        accepted = accepted_course_instructors(obj)
        if accepted:
            names = [
                instructor.full_name or instructor.email
                for instructor in accepted
            ]
            return ", ".join(names)
        return obj.instructor_name

    @extend_schema_field(serializers.ListField())
    def get_instructors(self, obj):
        instructors = []
        for instructor in accepted_course_instructors(obj):
            instructors.append(
                {
                    "id": instructor.id,
                    "full_name": instructor.full_name or instructor.email,
                }
            )
        return instructors


class CourseProgramDetailSerializer(CourseProgramSummarySerializer):
    modules = CourseModuleSerializer(many=True)

    class Meta(CourseProgramSummarySerializer.Meta):
        fields = CourseProgramSummarySerializer.Meta.fields + ["modules"]


class CourseProgramWriteSerializer(serializers.ModelSerializer):
    modules = CourseModuleWriteSerializer(many=True, required=False)
    status = serializers.ChoiceField(choices=CourseProgramStatus.choices, required=False)

    class Meta:
        model = CourseProgram
        fields = [
            "id",
            "title",
            "description",
            "category",
            "difficulty",
            "instructor_name",
            "tags",
            "offering_type",
            "is_free",
            "price_amount",
            "price_currency",
            "service_credit_hours",
            "auto_issue_service_credit",
            "service_credit_title",
            "service_credit_description",
            "enrollment_open",
            "status",
            "modules",
        ]
        read_only_fields = ["id"]

    def validate_tags(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list of strings.")
        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError("Each tag must be a string.")
            tag = item.strip()
            if tag:
                cleaned.append(tag)
        return cleaned

    def validate(self, attrs):
        is_free = attrs.get("is_free")
        price_amount = attrs.get("price_amount")
        organization = self.context.get("organization")
        offering_type = attrs.get("offering_type") or getattr(
            self.instance,
            "offering_type",
            CourseOfferingType.STANDARD,
        )
        auto_issue_service_credit = attrs.get("auto_issue_service_credit")
        if auto_issue_service_credit is None:
            auto_issue_service_credit = getattr(
                self.instance,
                "auto_issue_service_credit",
                False,
            )
        service_credit_hours = attrs.get("service_credit_hours")
        if service_credit_hours is None:
            service_credit_hours = getattr(
                self.instance,
                "service_credit_hours",
                Decimal("0"),
            )
        service_credit_title = attrs.get("service_credit_title")
        if service_credit_title is None:
            service_credit_title = getattr(self.instance, "service_credit_title", "")
        service_credit_description = attrs.get("service_credit_description")
        if service_credit_description is None:
            service_credit_description = getattr(
                self.instance,
                "service_credit_description",
                "",
            )

        effective_is_free = (
            is_free
            if is_free is not None
            else getattr(self.instance, "is_free", True)
        )

        if is_free is False and price_amount is not None and price_amount <= 0:
            raise serializers.ValidationError(
                {"price_amount": "Paid courses must have a positive price amount."}
            )

        if (
            effective_is_free is False
            and organization is not None
            and not can_organization_create_paid_course(organization)
        ):
            raise serializers.ValidationError(
                {
                    "is_free": (
                        "Only verified organizations can create or edit paid courses."
                    )
                }
            )

        if (
            offering_type != CourseOfferingType.COMMUNITY_SERVICE
            and auto_issue_service_credit
        ):
            raise serializers.ValidationError(
                {
                    "auto_issue_service_credit": (
                        "Automatic service-credit issuance is only available for community-service offerings."
                    )
                }
            )

        if offering_type != CourseOfferingType.COMMUNITY_SERVICE:
            if attrs.get("offering_type") == CourseOfferingType.STANDARD:
                service_credit_hours = Decimal("0")
                service_credit_title = ""
                service_credit_description = ""
            has_community_service_data = any(
                [
                    Decimal(str(service_credit_hours or "0")) > 0,
                    bool(str(service_credit_title or "").strip()),
                    bool(str(service_credit_description or "").strip()),
                ]
            )
            if has_community_service_data:
                raise serializers.ValidationError(
                    {
                        "offering_type": (
                            "Service-credit metadata is only allowed for community-service offerings."
                        )
                    }
                )

        if auto_issue_service_credit and Decimal(str(service_credit_hours or "0")) <= 0:
            raise serializers.ValidationError(
                {
                    "service_credit_hours": (
                        "Automatic service-credit issuance requires a positive credit-hour value."
                    )
                }
            )

        if (
            auto_issue_service_credit
            and organization is not None
            and organization.verification_status != OrganizationVerificationStatus.VERIFIED
        ):
            raise serializers.ValidationError(
                {
                    "auto_issue_service_credit": (
                        "Only verified organizations can enable automatic service-credit issuance."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        modules_data = validated_data.pop("modules", [])
        organization = self.context["organization"]
        self._normalize_community_service_fields(validated_data)
        course_program = CourseProgram.objects.create(
            organization=organization,
            **validated_data,
        )
        self._replace_modules(course_program, modules_data)
        return course_program

    def update(self, instance, validated_data):
        modules_data = validated_data.pop("modules", None)
        self._normalize_community_service_fields(validated_data)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if modules_data is not None:
            self._replace_modules(instance, modules_data)
        return instance

    @staticmethod
    def _normalize_community_service_fields(validated_data):
        offering_type = validated_data.get("offering_type")
        if offering_type == CourseOfferingType.COMMUNITY_SERVICE or offering_type is None:
            return
        validated_data["auto_issue_service_credit"] = False
        validated_data["service_credit_title"] = ""
        validated_data["service_credit_description"] = ""
        validated_data["service_credit_hours"] = Decimal("0")

    def _replace_modules(self, course_program, modules_data):
        existing_lessons = {
            lesson.id: lesson
            for lesson in LessonItem.objects.filter(module__course_program=course_program)
        }
        course_program.modules.all().delete()
        for module_index, module_data in enumerate(modules_data):
            module_data = dict(module_data)
            lessons_data = module_data.pop("lesson_items", [])
            module_data.pop("id", None)
            module_sort_order = module_data.pop("sort_order", module_index)
            module = CourseModule.objects.create(
                course_program=course_program,
                sort_order=module_sort_order,
                **module_data,
            )
            for lesson_index, lesson_data in enumerate(lessons_data):
                lesson_data = dict(lesson_data)
                existing_lesson = existing_lessons.get(lesson_data.pop("id", None))
                lesson_sort_order = lesson_data.pop("sort_order", lesson_index)
                retain_existing_file = lesson_data.pop("retain_existing_file", False)
                lesson_data.pop("upload_key", None)
                lesson_type = lesson_data.get("item_type")
                if lesson_type != LessonItemType.RESOURCE:
                    lesson_data["content_file"] = None
                elif (
                    not lesson_data.get("content_file")
                    and retain_existing_file
                    and existing_lesson
                    and existing_lesson.content_file
                ):
                    lesson_data["content_file"] = existing_lesson.content_file.name
                if lesson_type != LessonItemType.CHECKLIST:
                    lesson_data["checklist_items"] = []
                LessonItem.objects.create(
                    module=module,
                    sort_order=lesson_sort_order,
                    **lesson_data,
                )


class EnrollmentCourseProgramSerializer(CourseProgramSummarySerializer):
    pass


class CourseInstructorInvitationUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()


class CourseInstructorInvitationSerializer(serializers.ModelSerializer):
    invited_user = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    is_public = serializers.SerializerMethodField()

    class Meta:
        model = CourseInstructorInvitation
        fields = [
            "id",
            "invited_email",
            "status",
            "expires_at",
            "last_sent_at",
            "sent_count",
            "accepted_at",
            "declined_at",
            "revoked_at",
            "created_at",
            "updated_at",
            "invited_user",
            "is_expired",
            "is_public",
        ]
        read_only_fields = fields

    @extend_schema_field(CourseInstructorInvitationUserSerializer(allow_null=True))
    def get_invited_user(self, obj):
        if obj.user is None:
            return None
        return {
            "id": obj.user.id,
            "full_name": obj.user.full_name or obj.user.email,
            "email": obj.user.email,
            "role": obj.user.role,
        }

    @extend_schema_field(serializers.BooleanField())
    def get_is_expired(self, obj):
        return obj.expires_at <= timezone.now()

    @extend_schema_field(serializers.BooleanField())
    def get_is_public(self, obj):
        return obj.status == CourseInstructorInvitationStatus.ACCEPTED


class CourseInstructorInvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()


class CourseInstructorInvitationTokenQuerySerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=True)


class CourseInstructorInvitationRespondSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=True)
    action = serializers.ChoiceField(choices=["accept", "decline"])


class CourseInstructorInvitationPreviewSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="pk", read_only=True)
    invited_email = serializers.EmailField(read_only=True)
    status = serializers.CharField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    is_expired = serializers.SerializerMethodField()
    course_program = serializers.SerializerMethodField()
    invited_user = serializers.SerializerMethodField()
    can_respond = serializers.SerializerMethodField()
    response_actor_matches = serializers.SerializerMethodField()

    @extend_schema_field(serializers.BooleanField())
    def get_is_expired(self, obj):
        return obj.is_expired

    @extend_schema_field(serializers.JSONField())
    def get_course_program(self, obj):
        return {
            "id": obj.course_program_id,
            "title": obj.course_program.title,
            "organization_id": obj.course_program.organization_id,
            "organization_name": obj.course_program.organization.name,
        }

    @extend_schema_field(CourseInstructorInvitationUserSerializer(allow_null=True))
    def get_invited_user(self, obj):
        if obj.user is None:
            return None
        return {
            "id": obj.user.id,
            "full_name": obj.user.full_name or obj.user.email,
            "email": obj.user.email,
            "role": obj.user.role,
        }

    @extend_schema_field(serializers.BooleanField())
    def get_can_respond(self, obj):
        return obj.status == CourseInstructorInvitationStatus.PENDING and not obj.is_expired

    @extend_schema_field(serializers.BooleanField())
    def get_response_actor_matches(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return True
        return str(user.email or "").strip().lower() == obj.invited_email


class DashboardInstructorInvitationSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="pk", read_only=True)
    invited_email = serializers.EmailField(read_only=True)
    status = serializers.CharField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    last_sent_at = serializers.DateTimeField(read_only=True)
    accepted_at = serializers.DateTimeField(read_only=True)
    declined_at = serializers.DateTimeField(read_only=True)
    is_expired = serializers.SerializerMethodField()
    action_url = serializers.SerializerMethodField()
    course_program = serializers.SerializerMethodField()

    @extend_schema_field(serializers.BooleanField())
    def get_is_expired(self, obj):
        return obj.is_expired

    @extend_schema_field(serializers.CharField())
    def get_action_url(self, obj):
        return build_course_instructor_invitation_action_url(obj)

    @extend_schema_field(serializers.JSONField())
    def get_course_program(self, obj):
        return {
            "id": obj.course_program_id,
            "title": obj.course_program.title,
            "organization_id": obj.course_program.organization_id,
            "organization_name": obj.course_program.organization.name,
        }


class EnrollmentSummarySerializer(serializers.ModelSerializer):
    course_program = EnrollmentCourseProgramSerializer(read_only=True)
    enrolled_date = serializers.DateTimeField(source="enrolled_at", read_only=True)
    total_lessons = serializers.SerializerMethodField()
    completed_lessons = serializers.SerializerMethodField()
    next_lesson_id = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "status",
            "progress_percent",
            "enrolled_at",
            "enrolled_date",
            "completed_at",
            "course_program",
            "total_lessons",
            "completed_lessons",
            "next_lesson_id",
        ]

    def _progression_state(self, obj):
        state = getattr(obj, "_progression_state", None)
        if state is None:
            state = calculate_progression_state(obj)
            obj._progression_state = state
        return state

    @extend_schema_field(serializers.IntegerField())
    def get_total_lessons(self, obj):
        return self._progression_state(obj)["total_lessons"]

    @extend_schema_field(serializers.IntegerField())
    def get_completed_lessons(self, obj):
        return self._progression_state(obj)["completed_lessons"]

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_next_lesson_id(self, obj):
        return self._progression_state(obj)["next_lesson_id"]


class EnrollmentDetailSerializer(EnrollmentSummarySerializer):
    modules = serializers.SerializerMethodField()

    class Meta(EnrollmentSummarySerializer.Meta):
        fields = EnrollmentSummarySerializer.Meta.fields + [
            "modules",
        ]

    @extend_schema_field(serializers.ListField())
    def get_modules(self, obj):
        return self._progression_state(obj)["modules"]


class OrganizationEnrollmentSerializer(EnrollmentSummarySerializer):
    learner = serializers.SerializerMethodField()

    class Meta(EnrollmentSummarySerializer.Meta):
        fields = [
            "id",
            "status",
            "progress_percent",
            "enrolled_at",
            "enrolled_date",
            "completed_at",
            "course_program",
            "total_lessons",
            "completed_lessons",
            "next_lesson_id",
            "learner",
        ]

    @extend_schema_field(serializers.JSONField())
    def get_learner(self, obj):
        return {
            "id": obj.user_id,
            "full_name": obj.user.full_name,
            "email": obj.user.email,
        }
