import json

from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.common.enums import CourseProgramStatus, PaymentTransactionStatus, Role
from apps.common.permissions import IsOrganizationActor, IsRegularUser, normalize_actor_role
from apps.common.trust import get_paid_course_enrollment_gate
from apps.courses.models import CourseModule, CourseProgram, Enrollment, LessonItem
from apps.courses.serializers import (
    CourseProgramDetailSerializer,
    CourseProgramSummarySerializer,
    CourseProgramWriteSerializer,
    EnrollmentDetailSerializer,
    OrganizationEnrollmentSerializer,
    EnrollmentSummarySerializer,
)
from apps.courses.services import complete_lesson_for_enrollment, sync_enrollment_state
from apps.organizations.models import Organization
from apps.payments.models import PaymentTransaction


def course_program_queryset():
    return (
        CourseProgram.objects.select_related(
            "organization",
            "organization__owner",
            "organization__financial_account",
        )
        .prefetch_related(
            Prefetch("modules", queryset=CourseModule.objects.prefetch_related("lesson_items"))
        )
        .annotate(
            total_lessons=Count("modules__lesson_items", distinct=True),
            enrolled_count=Count("enrollments", distinct=True),
        )
    )


def learner_enrollment_queryset(user):
    return (
        Enrollment.objects.filter(user=user)
        .select_related("course_program", "course_program__organization")
        .prefetch_related(
            "lesson_progresses",
            Prefetch(
                "course_program__modules",
                queryset=CourseModule.objects.prefetch_related("lesson_items"),
            ),
        )
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
        return Enrollment.objects.filter(user=user, course_program=course_program).exists()
    return False


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
        return course_program_queryset().filter(status=CourseProgramStatus.PUBLISHED)


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
        return course_program_queryset().filter(status=CourseProgramStatus.PUBLISHED)

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
        return Organization.objects.get(owner=self.request.user)

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
        return course_program_queryset().filter(organization__owner=self.request.user)

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
        ).first()
        if course_program is None:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

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
