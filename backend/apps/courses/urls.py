from django.urls import path

from apps.courses.views import (
    CourseProgramDetailView,
    OrganizationCourseProgramDetailView,
    OrganizationCourseProgramListCreateView,
    OrganizationEnrollmentListView,
    PublishedCourseProgramListView,
    RegularUserCourseEnrollmentCreateView,
    RegularUserCourseEnrollmentDetailView,
    RegularUserEnrollmentListView,
    RegularUserLessonCompletionView,
)

urlpatterns = [
    path("courses/", PublishedCourseProgramListView.as_view(), name="course-list"),
    path("courses/<int:pk>/", CourseProgramDetailView.as_view(), name="course-detail"),
    path("courses/manage/", OrganizationCourseProgramListCreateView.as_view(), name="course-manage-list-create"),
    path("courses/manage/<int:pk>/", OrganizationCourseProgramDetailView.as_view(), name="course-manage-detail"),
    path("courses/manage/enrollments/", OrganizationEnrollmentListView.as_view(), name="course-manage-enrollment-list"),
    path("courses/enrollments/", RegularUserEnrollmentListView.as_view(), name="course-enrollment-list"),
    path("courses/<int:pk>/enroll/", RegularUserCourseEnrollmentCreateView.as_view(), name="course-enroll"),
    path("courses/<int:pk>/progress/", RegularUserCourseEnrollmentDetailView.as_view(), name="course-progress-detail"),
    path(
        "courses/<int:pk>/lessons/<int:lesson_id>/complete/",
        RegularUserLessonCompletionView.as_view(),
        name="course-lesson-complete",
    ),
]
