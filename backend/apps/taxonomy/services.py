from django.utils.text import slugify

from apps.common.enums import TaxonomyDomain
from apps.skills.models import FieldInterest, Skill
from apps.taxonomy.models import ManagedCategory


def _find_existing_entry(queryset, *, name, slug):
    return queryset.filter(slug=slug).first() or queryset.filter(name__iexact=name).first()


def get_catalog_queryset(domain):
    if domain == TaxonomyDomain.FIELD_INTEREST:
        return FieldInterest.objects.all()
    if domain == TaxonomyDomain.SKILL:
        return Skill.objects.all()
    return ManagedCategory.objects.filter(domain=domain)


def list_catalog_entries(*, domain=None, active_only=False):
    domains = [domain] if domain else list(TaxonomyDomain.values)
    entries = []
    for domain_value in domains:
        queryset = get_catalog_queryset(domain_value)
        if active_only:
            queryset = queryset.filter(is_active=True)
        for item in queryset.order_by("name", "id"):
            entries.append(build_catalog_entry_payload(item, domain_value))
    return sorted(entries, key=lambda item: (item["domain"], item["name"].lower(), item["id"]))


def build_catalog_entry_payload(entry, domain):
    return {
        "id": entry.id,
        "domain": domain,
        "name": entry.name,
        "slug": entry.slug,
        "description": getattr(entry, "description", "") or "",
        "is_active": bool(entry.is_active),
        "created_at": getattr(entry, "created_at", None),
        "updated_at": getattr(entry, "updated_at", None),
    }


def get_catalog_entry(domain, pk):
    return get_catalog_queryset(domain).filter(pk=pk).first()


def create_or_reactivate_catalog_entry(*, domain, name, description="", approved_by=None, approved_at=None):
    normalized_name = str(name or "").strip()
    slug = slugify(normalized_name)
    description = str(description or "").strip()

    if domain == TaxonomyDomain.FIELD_INTEREST:
        entry = _find_existing_entry(FieldInterest.objects.all(), name=normalized_name, slug=slug)
        if entry is None:
            return FieldInterest.objects.create(name=normalized_name, slug=slug, is_active=True)
        changed_fields = []
        if entry.name != normalized_name:
            entry.name = normalized_name
            changed_fields.append("name")
        if entry.slug != slug:
            entry.slug = slug
            changed_fields.append("slug")
        if not entry.is_active:
            entry.is_active = True
            changed_fields.append("is_active")
        if changed_fields:
            entry.save(update_fields=changed_fields)
        return entry

    if domain == TaxonomyDomain.SKILL:
        entry = _find_existing_entry(Skill.objects.all(), name=normalized_name, slug=slug)
        if entry is None:
            return Skill.objects.create(
                name=normalized_name,
                slug=slug,
                description=description,
                is_active=True,
            )
        changed_fields = []
        if entry.name != normalized_name:
            entry.name = normalized_name
            changed_fields.append("name")
        if entry.slug != slug:
            entry.slug = slug
            changed_fields.append("slug")
        if description and entry.description != description:
            entry.description = description
            changed_fields.append("description")
        if not entry.is_active:
            entry.is_active = True
            changed_fields.append("is_active")
        if changed_fields:
            entry.save(update_fields=changed_fields)
        return entry

    entry = _find_existing_entry(
        ManagedCategory.objects.filter(domain=domain),
        name=normalized_name,
        slug=slug,
    )
    if entry is None:
        return ManagedCategory.objects.create(
            domain=domain,
            name=normalized_name,
            slug=slug,
            description=description,
            is_active=True,
            approved_by=approved_by,
            approved_at=approved_at,
        )

    changed_fields = []
    if entry.name != normalized_name:
        entry.name = normalized_name
        changed_fields.append("name")
    if entry.slug != slug:
        entry.slug = slug
        changed_fields.append("slug")
    if entry.description != description:
        entry.description = description
        changed_fields.append("description")
    if not entry.is_active:
        entry.is_active = True
        changed_fields.append("is_active")
    if approved_by is not None and entry.approved_by_id != approved_by.id:
        entry.approved_by = approved_by
        changed_fields.append("approved_by")
    if approved_at is not None and entry.approved_at != approved_at:
        entry.approved_at = approved_at
        changed_fields.append("approved_at")
    if changed_fields:
        entry.save(update_fields=changed_fields + ["updated_at"])
    return entry


def update_catalog_entry(*, domain, entry, name=None, description=None, is_active=None):
    changed_fields = []
    if name is not None:
        normalized_name = str(name).strip()
        normalized_slug = slugify(normalized_name)
        if entry.name != normalized_name:
            entry.name = normalized_name
            changed_fields.append("name")
        if entry.slug != normalized_slug:
            entry.slug = normalized_slug
            changed_fields.append("slug")
    if hasattr(entry, "description") and description is not None:
        cleaned_description = str(description or "").strip()
        if entry.description != cleaned_description:
            entry.description = cleaned_description
            changed_fields.append("description")
    if is_active is not None and entry.is_active != is_active:
        entry.is_active = is_active
        changed_fields.append("is_active")
    if changed_fields:
        if domain in {
            TaxonomyDomain.FIELD_INTEREST,
            TaxonomyDomain.SKILL,
        }:
            entry.save(update_fields=changed_fields)
        else:
            entry.save(update_fields=changed_fields + ["updated_at"])
    return entry
