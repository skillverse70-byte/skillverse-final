from django.urls import path

from apps.taxonomy.views import TaxonomyCatalogListView, TaxonomySuggestionListCreateView

urlpatterns = [
    path("taxonomy/catalog/", TaxonomyCatalogListView.as_view(), name="taxonomy-catalog-list"),
    path("taxonomy/suggestions/", TaxonomySuggestionListCreateView.as_view(), name="taxonomy-suggestion-list-create"),
]

