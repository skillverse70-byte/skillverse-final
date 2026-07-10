from django.urls import path

from apps.courses.admin_views import (
    AdminCourseInstructorInvitationListView,
    AdminCourseModerationDecisionView,
    AdminCourseModerationListView,
)

urlpatterns = [
    path("courses/", AdminCourseModerationListView.as_view(), name="admin-course-list"),
    path("courses/<int:pk>/decision/", AdminCourseModerationDecisionView.as_view(), name="admin-course-decision"),
    path(
        "course-instructor-invitations/",
        AdminCourseInstructorInvitationListView.as_view(),
        name="admin-course-instructor-invitation-list",
    ),
]
