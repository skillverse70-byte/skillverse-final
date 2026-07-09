from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import CourseOfferingType, CourseProgramStatus, OrganizationType, Role
from apps.courses.models import CourseModule, CourseProgram, Enrollment, LessonItem
from apps.organizations.models import Organization
from apps.payments.models import FinancialAccount

User = get_user_model()


class CourseApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.organization_user = User.objects.create_user(
            email="org-courses@example.com",
            password="StrongPass123!",
            full_name="Course Organization",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Course Organization",
            type=OrganizationType.COMPANY,
            description="Builds practical learning programs.",
            contact_email="contact@course-organization.test",
        )
        self.other_organization_user = User.objects.create_user(
            email="other-org@example.com",
            password="StrongPass123!",
            full_name="Other Organization",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.other_organization = Organization.objects.create(
            owner=self.other_organization_user,
            name="Other Organization",
            type=OrganizationType.INSTITUTION,
            description="Separate owner.",
            contact_email="contact@other-org.test",
        )
        self.regular_user = User.objects.create_user(
            email="learner@example.com",
            password="StrongPass123!",
            full_name="Learner User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )

    def authenticate(self, email, password):
        cache.clear()
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def build_course_payload(self, **overrides):
        payload = {
            "title": "Backend Product Analytics Bootcamp",
            "description": "A structured product analytics course.",
            "category": "Analytics",
            "difficulty": "intermediate",
            "instructor_name": "SkillVerse Mentor",
            "tags": ["analytics", "sql"],
            "is_free": True,
            "price_amount": "0.00",
            "price_currency": "ETB",
            "enrollment_open": True,
            "status": CourseProgramStatus.DRAFT,
            "modules": [
                {
                    "title": "Getting Started",
                    "description": "Introductory module",
                    "lessons": [
                        {
                            "title": "Welcome video",
                            "type": "video",
                            "description": "Orientation lesson",
                            "content_url": "https://example.com/welcome",
                            "duration_minutes": 12,
                            "progression_gate": False,
                        },
                        {
                            "title": "Read the kickoff brief",
                            "type": "reading",
                            "description": "Foundational reading",
                            "content_url": "https://example.com/brief",
                            "duration_minutes": 8,
                            "progression_gate": False,
                        },
                    ],
                },
                {
                    "title": "Checkpoint",
                    "description": "Progression control",
                    "lessons": [
                        {
                            "title": "Knowledge check",
                            "type": "assessment",
                            "description": "Assessment before the next module",
                            "content_url": "https://example.com/checkpoint",
                            "duration_minutes": 15,
                            "progression_gate": True,
                        }
                    ],
                },
            ],
        }
        payload.update(overrides)
        return payload

    def test_organization_can_create_course_with_modules_and_lesson_items(self):
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CourseProgram.objects.count(), 1)
        course_program = CourseProgram.objects.get()
        self.assertEqual(course_program.organization, self.organization)
        self.assertEqual(course_program.category, "Analytics")
        self.assertEqual(course_program.tags, ["analytics", "sql"])
        self.assertEqual(course_program.modules.count(), 2)
        self.assertEqual(LessonItem.objects.count(), 3)
        self.assertEqual(response.data["total_lessons"], 3)
        self.assertEqual(response.data["modules"][0]["lessons"][0]["type"], "video")
        self.assertTrue(response.data["modules"][1]["lessons"][0]["progression_gate"])

    def test_organization_can_update_course_and_replace_nested_structure(self):
        self.organization.verification_status = "verified"
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate("org-courses@example.com", "StrongPass123!")
        create_response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(),
            format="json",
        )
        course_id = create_response.data["id"]

        resource_file = SimpleUploadedFile(
            "updated-resource.pdf",
            b"%PDF-1.4 updated document",
            content_type="application/pdf",
        )

        update_response = self.client.patch(
            reverse("course-manage-detail", args=[course_id]),
            {
                "payload": (
                    '{"title":"Updated Analytics Bootcamp","is_free":false,"price_amount":"1499.00",'
                    '"price_currency":"ETB","modules":[{"title":"Updated Module","description":"Replacement module",'
                    '"lessons":[{"client_key":"updated-resource","title":"Updated resource pack","type":"resource",'
                    '"description":"Downloadable resource","upload_key":"lesson_upload_updated-resource"}]}]}'
                ),
                "lesson_upload_updated-resource": resource_file,
            },
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        course_program = CourseProgram.objects.get(pk=course_id)
        self.assertEqual(course_program.title, "Updated Analytics Bootcamp")
        self.assertFalse(course_program.is_free)
        self.assertEqual(course_program.price_amount, Decimal("1499.00"))
        self.assertEqual(course_program.modules.count(), 1)
        self.assertEqual(LessonItem.objects.filter(module__course_program=course_program).count(), 1)
        self.assertEqual(update_response.data["modules"][0]["lessons"][0]["type"], "resource")

    def test_organization_can_add_modules_and_lessons_after_initial_course_create(self):
        self.authenticate("org-courses@example.com", "StrongPass123!")
        create_response = self.client.post(
            reverse("course-manage-list-create"),
            {
                "title": "Course saved first",
                "description": "Starts empty and is expanded later.",
                "status": CourseProgramStatus.DRAFT,
            },
            format="json",
        )
        course_id = create_response.data["id"]

        update_response = self.client.patch(
            reverse("course-manage-detail", args=[course_id]),
            {
                "modules": [
                    {
                        "title": "Foundations",
                        "description": "First real module",
                        "lessons": [
                            {
                                "title": "Starter lesson",
                                "type": "video",
                                "description": "Introduces the module",
                                "content_url": "https://example.com/starter",
                                "duration_minutes": 10,
                            }
                        ],
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        course_program = CourseProgram.objects.get(pk=course_id)
        self.assertEqual(course_program.modules.count(), 1)
        self.assertEqual(LessonItem.objects.filter(module__course_program=course_program).count(), 1)
        self.assertEqual(update_response.data["modules"][0]["title"], "Foundations")
        self.assertEqual(update_response.data["modules"][0]["lessons"][0]["title"], "Starter lesson")

    def test_public_list_and_detail_only_expose_published_courses(self):
        draft_course = CourseProgram.objects.create(
            organization=self.organization,
            title="Draft Course",
            status=CourseProgramStatus.DRAFT,
        )
        published_course = CourseProgram.objects.create(
            organization=self.organization,
            title="Published Course",
            description="Visible to guests.",
            status=CourseProgramStatus.PUBLISHED,
            category="Data",
        )
        module = CourseModule.objects.create(
            course_program=published_course,
            title="Public Module",
            sort_order=0,
        )
        LessonItem.objects.create(
            module=module,
            title="Public Lesson",
            item_type="video",
            sort_order=0,
        )

        list_response = self.client.get(reverse("course-list"))
        detail_response = self.client.get(reverse("course-detail", args=[published_course.id]))
        draft_detail_response = self.client.get(reverse("course-detail", args=[draft_course.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["title"], "Published Course")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["modules"][0]["lessons"][0]["title"], "Public Lesson")
        self.assertEqual(draft_detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_course_payload_includes_safe_financial_account_state(self):
        FinancialAccount.objects.create(
            organization=self.organization,
            provider="chapa",
            status="ready",
        )
        published_course = CourseProgram.objects.create(
            organization=self.organization,
            title="Paid Ready Course",
            status=CourseProgramStatus.PUBLISHED,
            is_free=False,
            price_amount="99.00",
        )

        response = self.client.get(reverse("course-detail", args=[published_course.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["financial_account"]["provider"], "chapa")
        self.assertEqual(response.data["financial_account"]["status"], "ready")

    def test_organization_can_create_document_resource_lesson_with_uploaded_file(self):
        self.authenticate("org-courses@example.com", "StrongPass123!")
        document = SimpleUploadedFile(
            "resource-guide.pdf",
            b"%PDF-1.4 test document",
            content_type="application/pdf",
        )

        response = self.client.post(
            reverse("course-manage-list-create"),
            {
                "payload": (
                    '{"title":"Document Course","description":"Docs","status":"draft","modules":'
                    '[{"title":"Resources","lessons":[{"client_key":"doc-1","title":"Starter PDF",'
                    '"type":"resource","description":"Downloadable guide","upload_key":"lesson_upload_doc-1"}]}]}'
                ),
                "lesson_upload_doc-1": document,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lesson = LessonItem.objects.get(title="Starter PDF")
        self.assertTrue(bool(lesson.content_file))
        self.assertTrue(lesson.content_file.name.endswith(".pdf"))

    def test_non_enrolled_users_only_see_course_structure(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Protected Course",
            status=CourseProgramStatus.PUBLISHED,
            is_free=False,
            price_amount="99.00",
        )
        module = CourseModule.objects.create(
            course_program=course_program,
            title="Protected Module",
            sort_order=0,
        )
        LessonItem.objects.create(
            module=module,
            title="Secret Video",
            item_type="video",
            description="Protected lesson notes",
            content_url="https://youtu.be/example",
            sort_order=0,
        )

        response = self.client.get(reverse("course-detail", args=[course_program.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["modules"][0]["lessons"][0]["title"], "Secret Video")
        self.assertEqual(response.data["modules"][0]["lessons"][0]["description"], "")
        self.assertEqual(response.data["modules"][0]["lessons"][0]["content_url"], "")

    def test_enrolled_user_can_view_full_lesson_content_in_progress_endpoint(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Open Content Course",
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
            enrollment_open=True,
        )
        module = CourseModule.objects.create(
            course_program=course_program,
            title="Module",
            sort_order=0,
        )
        lesson = LessonItem.objects.create(
            module=module,
            title="Checklist Lesson",
            item_type="checklist",
            description="Finish these steps",
            checklist_items=["Read the brief", "Upload your reflection"],
            sort_order=0,
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=course_program,
            status="active",
        )

        self.authenticate("learner@example.com", "StrongPass123!")
        response = self.client.get(reverse("course-progress-detail", args=[course_program.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload_lesson = response.data["modules"][0]["lessons"][0]
        self.assertEqual(payload_lesson["title"], lesson.title)
        self.assertEqual(payload_lesson["description"], "Finish these steps")
        self.assertEqual(payload_lesson["checklist_items"], ["Read the brief", "Upload your reflection"])

    def test_regular_user_cannot_access_organization_manage_endpoints(self):
        self.authenticate("learner@example.com", "StrongPass123!")

        list_response = self.client.get(reverse("course-manage-list-create"))
        create_response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(),
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_cannot_manage_another_organizations_course(self):
        course_program = CourseProgram.objects.create(
            organization=self.other_organization,
            title="Other Organization Course",
            status=CourseProgramStatus.DRAFT,
        )
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.patch(
            reverse("course-manage-detail", args=[course_program.id]),
            {"title": "Hijacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paid_course_requires_positive_price(self):
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                is_free=False,
                price_amount="0.00",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price_amount", response.data)

    def test_unverified_organization_cannot_create_paid_course(self):
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                is_free=False,
                price_amount="1499.00",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_free", response.data)

    def test_verified_organization_can_create_paid_course(self):
        self.organization.verification_status = "verified"
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                is_free=False,
                price_amount="1499.00",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_free"])
        self.assertEqual(response.data["offering_type"], CourseOfferingType.STANDARD)

    def test_verified_organization_can_create_paid_community_service_course(self):
        self.organization.verification_status = "verified"
        self.organization.save(update_fields=["verification_status", "updated_at"])
        FinancialAccount.objects.create(
            organization=self.organization,
            status="ready",
            business_name="Course Organization PLC",
        )
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                is_free=False,
                price_amount="1499.00",
                offering_type=CourseOfferingType.COMMUNITY_SERVICE,
                service_credit_hours="10.50",
                auto_issue_service_credit=True,
                service_credit_title="Volunteer Impact Credit",
                service_credit_description="Awarded after completing the community-service program.",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["offering_type"], CourseOfferingType.COMMUNITY_SERVICE)
        self.assertTrue(response.data["auto_issue_service_credit"])
        self.assertEqual(response.data["service_credit_hours"], "10.50")

    def test_standard_course_cannot_enable_auto_service_credit(self):
        self.organization.verification_status = "verified"
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                offering_type=CourseOfferingType.STANDARD,
                auto_issue_service_credit=True,
                service_credit_hours="6.00",
                service_credit_title="Should Fail",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("auto_issue_service_credit", response.data)

    def test_unverified_organization_cannot_edit_paid_course_without_making_it_free(self):
        self.organization.verification_status = "verified"
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate("org-courses@example.com", "StrongPass123!")
        create_response = self.client.post(
            reverse("course-manage-list-create"),
            self.build_course_payload(
                is_free=False,
                price_amount="1499.00",
            ),
            format="json",
        )
        course_id = create_response.data["id"]
        self.organization.verification_status = "unverified"
        self.organization.save(update_fields=["verification_status", "updated_at"])

        blocked_response = self.client.patch(
            reverse("course-manage-detail", args=[course_id]),
            {"title": "Still Paid"},
            format="json",
        )
        free_response = self.client.patch(
            reverse("course-manage-detail", args=[course_id]),
            {"is_free": True},
            format="json",
        )

        self.assertEqual(blocked_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_free", blocked_response.data)
        self.assertEqual(free_response.status_code, status.HTTP_200_OK)
        self.assertTrue(free_response.data["is_free"])

    def test_regular_user_can_enroll_and_progress_through_gated_course(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Guided Program",
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
            enrollment_open=True,
        )
        module = CourseModule.objects.create(
            course_program=course_program,
            title="Module 1",
            sort_order=0,
        )
        first_lesson = LessonItem.objects.create(
            module=module,
            title="Lesson 1",
            item_type="reading",
            sort_order=0,
        )
        gate_lesson = LessonItem.objects.create(
            module=module,
            title="Gate",
            item_type="assessment",
            progression_gate=True,
            sort_order=1,
        )
        locked_lesson = LessonItem.objects.create(
            module=module,
            title="Locked next",
            item_type="video",
            sort_order=2,
        )

        self.authenticate("learner@example.com", "StrongPass123!")

        enroll_response = self.client.post(reverse("course-enroll", args=[course_program.id]))
        self.assertEqual(enroll_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(enroll_response.data["status"], "active")
        self.assertFalse(enroll_response.data["modules"][0]["lessons"][2]["is_unlocked"])

        locked_response = self.client.post(
            reverse("course-lesson-complete", args=[course_program.id, locked_lesson.id])
        )
        self.assertEqual(locked_response.status_code, status.HTTP_403_FORBIDDEN)

        first_complete = self.client.post(
            reverse("course-lesson-complete", args=[course_program.id, first_lesson.id])
        )
        self.assertEqual(first_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(first_complete.data["progress_percent"], 33)
        self.assertFalse(first_complete.data["modules"][0]["lessons"][2]["is_unlocked"])

        gate_complete = self.client.post(
            reverse("course-lesson-complete", args=[course_program.id, gate_lesson.id])
        )
        self.assertEqual(gate_complete.status_code, status.HTTP_200_OK)
        self.assertTrue(gate_complete.data["modules"][0]["lessons"][2]["is_unlocked"])

        final_complete = self.client.post(
            reverse("course-lesson-complete", args=[course_program.id, locked_lesson.id])
        )
        self.assertEqual(final_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(final_complete.data["status"], "completed")
        self.assertEqual(final_complete.data["progress_percent"], 100)

    def test_regular_user_can_list_their_course_enrollments(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Dashboard Program",
            status=CourseProgramStatus.PUBLISHED,
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=course_program,
            status="active",
            progress_percent=55,
        )

        self.authenticate("learner@example.com", "StrongPass123!")
        response = self.client.get(reverse("course-enrollment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_program"]["title"], "Dashboard Program")

    def test_organization_can_list_participants_and_progress_for_owned_courses(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Participant Program",
            status=CourseProgramStatus.PUBLISHED,
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=course_program,
            status="active",
            progress_percent=55,
        )

        self.authenticate("org-courses@example.com", "StrongPass123!")
        response = self.client.get(reverse("course-manage-enrollment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_program"]["title"], "Participant Program")
        self.assertEqual(response.data[0]["learner"]["email"], "learner@example.com")

    def test_organization_enrollment_list_hides_other_organizations_participants(self):
        other_course_program = CourseProgram.objects.create(
            organization=self.other_organization,
            title="Other Participant Program",
            status=CourseProgramStatus.PUBLISHED,
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=other_course_program,
            status="active",
            progress_percent=25,
        )

        self.authenticate("org-courses@example.com", "StrongPass123!")
        response = self.client.get(reverse("course-manage-enrollment-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_organization_cannot_use_learner_enrollment_endpoints(self):
        course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Published Program",
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        self.authenticate("org-courses@example.com", "StrongPass123!")

        response = self.client.post(reverse("course-enroll", args=[course_program.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
