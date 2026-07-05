from django.urls import path

from apps.skills.views import (
    CurrentRegularUserProfileView,
    FieldInterestCatalogListView,
    SkillCatalogListView,
    UserFieldInterestDetailView,
    UserFieldInterestListCreateView,
    UserSkillDetailView,
    UserSkillListCreateView,
)

urlpatterns = [
    path("profile/me/", CurrentRegularUserProfileView.as_view(), name="profile-me"),
    path("profile/fields/", UserFieldInterestListCreateView.as_view(), name="profile-fields"),
    path("profile/fields/<int:pk>/", UserFieldInterestDetailView.as_view(), name="profile-field-detail"),
    path("profile/skills/", UserSkillListCreateView.as_view(), name="profile-skills"),
    path("profile/skills/<int:pk>/", UserSkillDetailView.as_view(), name="profile-skill-detail"),
    path("skills/catalog/", SkillCatalogListView.as_view(), name="skills-catalog"),
    path("fields/catalog/", FieldInterestCatalogListView.as_view(), name="fields-catalog"),
]
