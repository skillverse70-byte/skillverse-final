from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.common.enums import CourseProgramStatus
from apps.common.permissions import IsOrganizationActor, IsRegularUser
from apps.common.trust import get_paid_course_enrollment_gate
from apps.courses.models import CourseModule, CourseProgram, Enrollment, LessonItem
from apps.courses.serializers import (
    CourseProgramDetailSerializer,
    CourseProgramSummarySerializer,
    CourseProgramWriteSerializer,
    EnrollmentDetailSerializer,
    EnrollmentSummarySerializer,
)
from apps.courses.services import complete_lesson_for_enrollment, sync_enrollment_state
from apps.organizations.models import Organization


def course_program_queryset():
    return (
        CourseProgram.objects.select_related("organization", "organization__owner")
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

    def get(self, request):
        organization = self.get_organization()
        queryset = course_program_queryset().filter(organization=organization)
        serializer = CourseProgramDetailSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
                "organization": self.get_organization(),
            },
        )
        serializer.is_valid(raise_exception=True)
        course_program = serializer.save()
        response_serializer = CourseProgramDetailSerializer(course_program)
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
        serializer = CourseProgramDetailSerializer(self.get_object())
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        course_program = self.get_object()
        serializer = self.get_serializer(course_program, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = CourseProgramDetailSerializer(course_program)
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
            can_enroll = gate["can_enroll"] and course_program.enrollment_open

        if not can_enroll:
            raise PermissionDenied(detail=gate["label"])

        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course_program=course_program,
            defaults={"status": "active"},
        )
        sync_enrollment_state(enrollment)
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
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_200_OK)
