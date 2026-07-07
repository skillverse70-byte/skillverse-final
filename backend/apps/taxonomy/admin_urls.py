from django.urls import path

from apps.taxonomy.views import (
    AdminTaxonomyCatalogDetailView,
    AdminTaxonomyCatalogListCreateView,
    AdminTaxonomySuggestionDecisionView,
    AdminTaxonomySuggestionListView,
)

urlpatterns = [
    path("taxonomy/catalog/", AdminTaxonomyCatalogListCreateView.as_view(), name="admin-taxonomy-catalog-list-create"),
    path(
        "taxonomy/catalog/<str:domain>/<int:pk>/",
        AdminTaxonomyCatalogDetailView.as_view(),
        name="admin-taxonomy-catalog-detail",
    ),
    path("taxonomy/suggestions/", AdminTaxonomySuggestionListView.as_view(), name="admin-taxonomy-suggestion-list"),
    path(
        "taxonomy/suggestions/<int:pk>/decision/",
        AdminTaxonomySuggestionDecisionView.as_view(),
        name="admin-taxonomy-suggestion-decision",
    ),
]
