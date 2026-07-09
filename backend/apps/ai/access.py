from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.common.enums import Role
from apps.courses.models import Enrollment
from apps.events.models import EventRSVP
from apps.opportunities.models import JobApplication


def resolve_regular_user_target(*, request_user, actor_role, user_id):
    if actor_role == Role.REGULAR_USER:
        if user_id and user_id != request_user.id:
            raise PermissionDenied(detail="Regular users can only access their own AI guidance.")
        return request_user

    if not user_id:
        raise ValidationError({"user_id": "This actor must specify a regular-user target."})

    target_user = User.objects.filter(id=user_id, role=Role.REGULAR_USER).first()
    if target_user is None:
        raise NotFound(detail="Regular user not found.")

    if actor_role == Role.ADMIN:
        return target_user

    if actor_role == Role.ORGANIZATION:
        organization = getattr(request_user, "organization_profile", None)
        if organization is None:
            raise PermissionDenied(detail="Organization profile is required.")

        related_to_org = (
            Enrollment.objects.filter(
                user=target_user,
                course_program__organization=organization,
            ).exists()
            or JobApplication.objects.filter(
                user=target_user,
                opportunity__organization=organization,
            ).exists()
            or EventRSVP.objects.filter(
                user=target_user,
                event__organization=organization,
            ).exists()
        )
        if not related_to_org:
            raise PermissionDenied(
                detail="Organizations can only inspect AI feeds for related regular users."
            )
        return target_user

    raise PermissionDenied(detail="This actor cannot access AI guidance.")
