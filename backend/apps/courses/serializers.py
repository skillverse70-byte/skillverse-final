from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.enums import CourseProgramStatus, LessonItemType
from apps.common.trust import can_organization_create_paid_course
from apps.courses.models import CourseModule, CourseProgram, Enrollment, LessonItem
from apps.courses.services import calculate_progression_state


class LessonItemSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(
        source="item_type",
        choices=LessonItemType.choices,
    )

    class Meta:
        model = LessonItem
        fields = [
            "id",
            "title",
            "type",
            "description",
            "content_url",
            "duration_minutes",
            "sort_order",
            "is_required",
            "progression_gate",
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

    class Meta:
        model = CourseProgram
        fields = [
            "id",
            "organization_id",
            "organization_name",
            "organization_verification_status",
            "title",
            "description",
            "category",
            "difficulty",
            "instructor_name",
            "tags",
            "is_free",
            "price_amount",
            "price_currency",
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


class CourseProgramDetailSerializer(CourseProgramSummarySerializer):
    modules = CourseModuleSerializer(many=True)

    class Meta(CourseProgramSummarySerializer.Meta):
        fields = CourseProgramSummarySerializer.Meta.fields + ["modules"]


class CourseProgramWriteSerializer(serializers.ModelSerializer):
    modules = CourseModuleSerializer(many=True, required=False)
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
            "is_free",
            "price_amount",
            "price_currency",
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

        return attrs

    def create(self, validated_data):
        modules_data = validated_data.pop("modules", [])
        organization = self.context["organization"]
        course_program = CourseProgram.objects.create(
            organization=organization,
            **validated_data,
        )
        self._replace_modules(course_program, modules_data)
        return course_program

    def update(self, instance, validated_data):
        modules_data = validated_data.pop("modules", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if modules_data is not None:
            self._replace_modules(instance, modules_data)
        return instance

    def _replace_modules(self, course_program, modules_data):
        course_program.modules.all().delete()
        for module_index, module_data in enumerate(modules_data):
            module_data = dict(module_data)
            lessons_data = module_data.pop("lesson_items", [])
            module_sort_order = module_data.pop("sort_order", module_index)
            module = CourseModule.objects.create(
                course_program=course_program,
                sort_order=module_sort_order,
                **module_data,
            )
            for lesson_index, lesson_data in enumerate(lessons_data):
                lesson_data = dict(lesson_data)
                lesson_sort_order = lesson_data.pop("sort_order", lesson_index)
                LessonItem.objects.create(
                    module=module,
                    sort_order=lesson_sort_order,
                    **lesson_data,
                )


class EnrollmentCourseProgramSerializer(CourseProgramSummarySerializer):
    pass


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
