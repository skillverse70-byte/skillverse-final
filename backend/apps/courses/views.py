import json

from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.enums import (
    CourseInstructorInvitationStatus,
    CourseProgramStatus,
    PaymentTransactionStatus,
    Role,
)
from apps.common.permissions import IsOrganizationActor, IsRegularUser, normalize_actor_role
from apps.common.trust import get_paid_course_enrollment_gate
from apps.courses.models import (
    CourseInstructorInvitation,
    CourseModule,
    CourseProgram,
    Enrollment,
    LessonItem,
)
from apps.courses.serializers import (
    CourseInstructorInvitationCreateSerializer,
    CourseInstructorInvitationPreviewSerializer,
    CourseInstructorInvitationRespondSerializer,
    CourseInstructorInvitationSerializer,
    CourseInstructorInvitationTokenQuerySerializer,
    CourseProgramDetailSerializer,
    CourseProgramSummarySerializer,
    CourseProgramWriteSerializer,
    EnrollmentDetailSerializer,
    OrganizationEnrollmentSerializer,
    EnrollmentSummarySerializer,
)
from apps.courses.services import (
    assert_user_can_enroll_as_learner,
    complete_lesson_for_enrollment,
    create_course_instructor_invitation,
    get_course_instructor_invitation_by_token,
    is_user_assigned_course_instructor,
    respond_to_course_instructor_invitation,
    resend_course_instructor_invitation,
    revoke_course_instructor_invitation,
    sync_course_instructor_invitations_for_course,
    sync_enrollment_state,
)
from apps.organizations.models import Organization
from apps.payments.models import PaymentTransaction


def course_program_queryset():
    return (
        CourseProgram.objects.select_related(
            "organization",
            "organization__owner",
            "organization__financial_account",
            "admin_reviewed_by",
        )
        .prefetch_related(
            Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lesson_items")),
            Prefetch(
                "instructor_invitations",
                queryset=CourseInstructorInvitation.objects.select_related(
                    "user",
                    "invited_by",
                ).order_by("-created_at", "-id"),
            ),
        )
        .annotate(
            total_lessons=Count("modules__lesson_items", distinct=True),
            enrolled_count=Count("enrollments", distinct=True),
        )
    )


def learner_enrollment_queryset(user):
    return (
        Enrollment.objects.filter(user=user)
        .exclude(
            course_program__instructor_invitations__user=user,
            course_program__instructor_invitations__status=CourseInstructorInvitationStatus.ACCEPTED,
        )
        .select_related("course_program", "course_program__organization")
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
        .distinct()
        .order_by("-updated_at", "-id")
    )


def with_absolute_enrollment_content(request, enrollment):
    state = calculate_progression_state_with_absolute_urls(enrollment, request)
    enrollment._progression_state = state
    return enrollment


def calculate_progression_state_with_absolute_urls(enrollment, request):
    from apps.courses.services import calculate_progression_state

    state = calculate_progression_state(enrollment)
    if request is None:
        return state
    for module in state["modules"]:
        for lesson in module["lessons"]:
            file_url = lesson.get("content_file_url") or ""
            if file_url and not file_url.startswith("http"):
                lesson["content_file_url"] = request.build_absolute_uri(file_url)
    return state


def can_view_course_content(user, course_program):
    if not getattr(user, "is_authenticated", False):
        return False

    role = normalize_actor_role(user)
    if role == Role.ADMIN:
        return True
    if role == Role.ORGANIZATION and course_program.organization.owner_id == user.id:
        return True
    if role == Role.REGULAR_USER:
        if is_user_assigned_course_instructor(user, course_program):
            return True
        return Enrollment.objects.filter(user=user, course_program=course_program).exists()
    return False


def instructor_assignment_conflict_response():
    raise PermissionDenied(
        detail="Assigned instructors cannot enroll in or track progress for their own course as learners."
    )


def parse_course_write_data(request):
    if "payload" not in request.data:
        return request.data

    try:
        payload = json.loads(request.data.get("payload", "{}"))
    except json.JSONDecodeError as exc:
        raise ValidationError({"detail": "Course payload is invalid."}) from exc

    for module in payload.get("modules", []):
        for lesson in module.get("lessons", []):
            upload_key = lesson.get("upload_key")
            if upload_key and upload_key in request.FILES:
                lesson["content_file"] = request.FILES[upload_key]
    return payload


def organization_enrollment_queryset(user):
    return (
        Enrollment.objects.filter(course_program__organization__owner=user)
        .select_related(
            "user",
            "course_program",
            "course_program__organization",
        )
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
        .order_by("-updated_at", "-id")
    )


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_public_list",
        responses={200: CourseProgramSummarySerializer(many=True)},
    )
)
class PublishedCourseProgramListView(ListAPIView):
    serializer_class = CourseProgramSummarySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return course_program_queryset().filter(
            status=CourseProgramStatus.PUBLISHED,
            organization__is_suspended=False,
        )


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_public_retrieve",
        responses={200: CourseProgramDetailSerializer},
    )
)
class CourseProgramDetailView(RetrieveAPIView):
    serializer_class = CourseProgramDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return course_program_queryset().filter(
            status=CourseProgramStatus.PUBLISHED,
            organization__is_suspended=False,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        course_program = getattr(self, "_course_program", None)
        context["include_lesson_content"] = (
            can_view_course_content(self.request.user, course_program)
            if course_program is not None
            else False
        )
        return context

    def retrieve(self, request, *args, **kwargs):
        self._course_program = self.get_object()
        serializer = self.get_serializer(self._course_program)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_list",
        responses={200: CourseProgramDetailSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_create",
        request=CourseProgramWriteSerializer,
        responses={201: CourseProgramDetailSerializer},
    ),
)
class OrganizationCourseProgramListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = CourseProgramWriteSerializer

    def get_organization(self):
        organization = Organization.objects.get(owner=self.request.user)
        if organization.is_suspended:
            raise PermissionDenied(detail="Organization access is suspended.")
        return organization

    def serialize_detail(self, course_program, many=False):
        return CourseProgramDetailSerializer(
            course_program,
            many=many,
            context={
                "request": self.request,
                "include_lesson_content": True,
            },
        )

    def get(self, request):
        organization = self.get_organization()
        queryset = course_program_queryset().filter(organization=organization)
        serializer = self.serialize_detail(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(
            data=parse_course_write_data(request),
            context={
                "request": request,
                "organization": self.get_organization(),
            },
        )
        serializer.is_valid(raise_exception=True)
        course_program = serializer.save()
        response_serializer = self.serialize_detail(course_program)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_retrieve",
        responses={200: CourseProgramDetailSerializer},
    ),
    put=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_replace",
        request=CourseProgramWriteSerializer,
        responses={200: CourseProgramDetailSerializer},
    ),
    patch=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_update",
        request=CourseProgramWriteSerializer,
        responses={200: CourseProgramDetailSerializer},
    ),
    delete=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_delete",
        responses={204: None},
    ),
)
class OrganizationCourseProgramDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = CourseProgramWriteSerializer

    def get_queryset(self):
        return course_program_queryset().filter(
            organization__owner=self.request.user,
            organization__is_suspended=False,
        )

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return CourseProgramDetailSerializer
        return CourseProgramWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = Organization.objects.get(owner=self.request.user)
        return context

    def retrieve(self, request, *args, **kwargs):
        serializer = CourseProgramDetailSerializer(
            self.get_object(),
            context={
                "request": request,
                "include_lesson_content": True,
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        course_program = self.get_object()
        serializer = self.get_serializer(
            course_program,
            data=parse_course_write_data(request),
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = CourseProgramDetailSerializer(
            course_program,
            context={
                "request": request,
                "include_lesson_content": True,
            },
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        course_program = self.get_object()
        course_program.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_instructor_list",
        responses={200: CourseInstructorInvitationSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_instructor_invite",
        request=CourseInstructorInvitationCreateSerializer,
        responses={201: CourseInstructorInvitationSerializer},
    ),
)
class OrganizationCourseInstructorInvitationListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = CourseInstructorInvitationSerializer

    def get_course_program(self):
        return course_program_queryset().filter(
            id=self.kwargs["pk"],
            organization__owner=self.request.user,
            organization__is_suspended=False,
        ).first()

    def get(self, request, pk):
        course_program = self.get_course_program()
        if course_program is None:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        invitations = sync_course_instructor_invitations_for_course(course_program)
        serializer = CourseInstructorInvitationSerializer(invitations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        course_program = self.get_course_program()
        if course_program is None:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseInstructorInvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            invitation = create_course_instructor_invitation(
                course_program=course_program,
                invited_by=request.user,
                invited_email=serializer.validated_data["email"],
            )
        except ValueError as exc:
            raise ValidationError({"email": str(exc)}) from exc

        response_serializer = CourseInstructorInvitationSerializer(invitation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_instructor_resend",
        responses={200: CourseInstructorInvitationSerializer},
    ),
    delete=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_instructor_revoke",
        responses={204: None},
    ),
)
class OrganizationCourseInstructorInvitationDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = CourseInstructorInvitationSerializer

    def get_course_program(self):
        return CourseProgram.objects.filter(
            id=self.kwargs["pk"],
            organization__owner=self.request.user,
            organization__is_suspended=False,
        ).first()

    def get_invitation(self):
        course_program = self.get_course_program()
        if course_program is None:
            return None
        invitation = (
            CourseInstructorInvitation.objects.select_related("user", "course_program")
            .filter(
                id=self.kwargs["invitation_id"],
                course_program=course_program,
            )
            .first()
        )
        if invitation is not None:
            invitation.sync_expired_status()
        return invitation

    def post(self, request, pk, invitation_id):
        invitation = self.get_invitation()
        if invitation is None:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            invitation = resend_course_instructor_invitation(
                invitation,
                resent_by=request.user,
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        serializer = CourseInstructorInvitationSerializer(invitation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, invitation_id):
        invitation = self.get_invitation()
        if invitation is None:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            revoke_course_instructor_invitation(invitation)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_instructor_invitation_preview",
        parameters=[CourseInstructorInvitationTokenQuerySerializer],
        responses={200: CourseInstructorInvitationPreviewSerializer},
    ),
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_instructor_invitation_respond",
        request=CourseInstructorInvitationRespondSerializer,
        responses={200: CourseInstructorInvitationPreviewSerializer},
    ),
)
class CourseInstructorInvitationResponseView(GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CourseInstructorInvitationRespondSerializer
        return CourseInstructorInvitationPreviewSerializer

    def get_invitation(self, token):
        invitation = get_course_instructor_invitation_by_token(token)
        if invitation is None:
            return None
        return invitation

    def get(self, request):
        query_serializer = CourseInstructorInvitationTokenQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)
        invitation = self.get_invitation(query_serializer.validated_data["token"])
        if invitation is None:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseInstructorInvitationPreviewSerializer(
            invitation,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CourseInstructorInvitationRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = self.get_invitation(serializer.validated_data["token"])
        if invitation is None:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        response_user = None
        if (
            request.user.is_authenticated
            and normalize_actor_role(request.user) == Role.REGULAR_USER
            and str(request.user.email or "").strip().lower() == invitation.invited_email
        ):
            response_user = request.user

        try:
            invitation = respond_to_course_instructor_invitation(
                invitation,
                user=response_user,
                action=serializer.validated_data["action"],
            )
        except PermissionError as exc:
            raise PermissionDenied(detail=str(exc)) from exc
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        action_value = serializer.validated_data["action"]
        past_tense = "accepted" if action_value == "accept" else "declined"
        record_audit_log(
            actor=response_user,
            action=f"course.instructor_invitation.{action_value}",
            target_type="course_instructor_invitation",
            target_id=invitation.id,
            summary=(
                f"{(response_user.full_name or response_user.email) if response_user else invitation.invited_email} "
                f"{past_tense} an instructor invitation for "
                f"{invitation.course_program.title}."
            ),
            metadata={
                "course_program_id": invitation.course_program_id,
                "organization_id": invitation.course_program.organization_id,
                "status": invitation.status,
                "invited_email": invitation.invited_email,
                "responded_with_link_only": response_user is None,
            },
        )

        response_serializer = CourseInstructorInvitationPreviewSerializer(
            invitation,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_enrollment_list",
        responses={200: EnrollmentSummarySerializer(many=True)},
    )
)
class RegularUserEnrollmentListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = EnrollmentSummarySerializer

    def get_queryset(self):
        return learner_enrollment_queryset(self.request.user)


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_manage_enrollment_list",
        responses={200: OrganizationEnrollmentSerializer(many=True)},
    )
)
class OrganizationEnrollmentListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = OrganizationEnrollmentSerializer

    def get_queryset(self):
        queryset = organization_enrollment_queryset(self.request.user)
        course_program_id = self.request.query_params.get("course_program_id")
        if course_program_id:
            queryset = queryset.filter(course_program_id=course_program_id)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


@extend_schema_view(
    get=extend_schema(
        tags=["courses"],
        operation_id="courses_enrollment_detail",
        responses={200: EnrollmentDetailSerializer},
    )
)
class RegularUserCourseEnrollmentDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = EnrollmentDetailSerializer

    def get(self, request, pk):
        course_program = course_program_queryset().filter(pk=pk).first()
        if course_program and is_user_assigned_course_instructor(request.user, course_program):
            instructor_assignment_conflict_response()

        enrollment = learner_enrollment_queryset(request.user).filter(course_program_id=pk).first()
        if enrollment is None:
            return Response({"detail": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        sync_enrollment_state(enrollment)
        with_absolute_enrollment_content(request, enrollment)
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_enroll",
        responses={201: EnrollmentDetailSerializer},
    )
)
class RegularUserCourseEnrollmentCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = EnrollmentDetailSerializer

    def post(self, request, pk):
        course_program = course_program_queryset().filter(
            pk=pk,
            status=CourseProgramStatus.PUBLISHED,
            organization__is_suspended=False,
        ).first()
        if course_program is None:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            assert_user_can_enroll_as_learner(request.user, course_program)
        except PermissionError as exc:
            raise PermissionDenied(detail=str(exc)) from exc

        gate = get_paid_course_enrollment_gate(
            course_program.organization,
            getattr(course_program.organization, "financial_account", None),
        )
        if course_program.is_free:
            can_enroll = course_program.enrollment_open
        else:
            has_verified_payment = PaymentTransaction.objects.filter(
                user=request.user,
                course_program=course_program,
                status=PaymentTransactionStatus.SUCCEEDED,
            ).exists()
            can_enroll = (
                gate["can_enroll"]
                and course_program.enrollment_open
                and has_verified_payment
            )

        if not can_enroll:
            if not course_program.is_free and gate["can_enroll"]:
                raise PermissionDenied(detail="Verified payment is required.")
            raise PermissionDenied(detail=gate["label"])

        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course_program=course_program,
            defaults={"status": "active"},
        )
        sync_enrollment_state(enrollment)
        if created:
            from django.db import transaction
            from apps.notifications.services import notify_enrollment_activated

            transaction.on_commit(lambda: notify_enrollment_activated(enrollment))
        with_absolute_enrollment_content(request, enrollment)
        serializer = self.get_serializer(enrollment)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["courses"],
        operation_id="courses_lesson_complete",
        responses={200: EnrollmentDetailSerializer},
    )
)
class RegularUserLessonCompletionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]
    serializer_class = EnrollmentDetailSerializer

    def post(self, request, pk, lesson_id):
        course_program = course_program_queryset().filter(pk=pk).first()
        if course_program and is_user_assigned_course_instructor(request.user, course_program):
            instructor_assignment_conflict_response()

        enrollment = learner_enrollment_queryset(request.user).filter(course_program_id=pk).first()
        if enrollment is None:
            return Response({"detail": "Enrollment not found."}, status=status.HTTP_404_NOT_FOUND)

        lesson_item = LessonItem.objects.filter(
            pk=lesson_id,
            module__course_program_id=pk,
        ).first()
        if lesson_item is None:
            return Response({"detail": "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            complete_lesson_for_enrollment(enrollment, lesson_item)
        except PermissionError as exc:
            raise PermissionDenied(detail=str(exc)) from exc
        except ValueError as exc:
            raise ValidationError(detail=str(exc)) from exc

        enrollment.refresh_from_db()
        with_absolute_enrollment_content(request, enrollment)
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_200_OK)
