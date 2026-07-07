from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.permissions import IsAdminActor
from apps.courses.admin_serializers import (
    AdminCourseModerationDecisionSerializer,
    AdminCourseModerationSerializer,
)
from apps.courses.models import CourseProgram


@extend_schema_view(
    get=extend_schema(
        tags=["courses", "admin"],
        operation_id="admin_courses_list",
        responses={200: AdminCourseModerationSerializer(many=True)},
    )
)
class AdminCourseModerationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminCourseModerationSerializer

    def get_queryset(self):
        queryset = CourseProgram.objects.select_related(
            "organization",
            "organization__owner",
            "admin_reviewed_by",
        ).order_by("-updated_at", "-id")
        status_value = self.request.query_params.get("status")
        organization_id = self.request.query_params.get("organization_id")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["courses", "admin"],
        operation_id="admin_courses_decision",
        request=AdminCourseModerationDecisionSerializer,
        responses={200: AdminCourseModerationSerializer},
    )
)
class AdminCourseModerationDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminCourseModerationDecisionSerializer

    def get_object(self, pk):
        course_program = CourseProgram.objects.select_related(
            "organization",
            "organization__owner",
            "admin_reviewed_by",
        ).filter(pk=pk).first()
        if course_program is None:
            raise NotFound("Course was not found.")
        return course_program

    def post(self, request, pk):
        course_program = self.get_object(pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        changed_fields = ["admin_reviewed_by", "admin_reviewed_at", "updated_at"]
        if "status" in serializer.validated_data:
            course_program.status = serializer.validated_data["status"]
            changed_fields.append("status")
        if "enrollment_open" in serializer.validated_data:
            course_program.enrollment_open = serializer.validated_data["enrollment_open"]
            changed_fields.append("enrollment_open")
        if "review_notes" in serializer.validated_data:
            course_program.admin_review_notes = serializer.validated_data.get("review_notes", "")
            changed_fields.append("admin_review_notes")
        course_program.admin_reviewed_by = request.user
        course_program.admin_reviewed_at = timezone.now()
        course_program.save(update_fields=changed_fields)

        record_audit_log(
            actor=request.user,
            action="course.admin.reviewed",
            target_type="course_program",
            target_id=course_program.id,
            summary=f"Admin reviewed course {course_program.title}.",
            metadata={
                "status": course_program.status,
                "enrollment_open": course_program.enrollment_open,
                "review_notes": course_program.admin_review_notes,
            },
        )

        return Response(AdminCourseModerationSerializer(course_program).data, status=status.HTTP_200_OK)
