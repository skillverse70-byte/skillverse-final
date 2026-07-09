import { lazy } from "react";
import { roles } from "@/lib/domain-enums";

const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const GetStartedPage = lazy(() => import("@/features/landing/pages/GetStartedPage"));
const OnboardingPage = lazy(() => import("@/features/onboarding/pages/OnboardingPage"));
const DiscoverPage = lazy(() => import("@/features/skills/pages/DiscoverPage"));
const CoursesPage = lazy(() => import("@/features/courses/pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/features/courses/pages/CourseDetailPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ForgetPasswordPage = lazy(() => import("@/features/auth/pages/ForgetPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const OrganizationOnboardingPage = lazy(() =>
  import("@/features/onboarding/pages/OrganizationOnboardingPage"));
const SkillSwapPage = lazy(() => import("@/features/skills/pages/SkillSwapPage"));
const EventsPage = lazy(() => import("@/features/events/pages/EventsPage"));
const EventDetailPage = lazy(() => import("@/features/events/pages/EventDetailPage"));
const JobsPage = lazy(() => import("@/features/jobs/pages/JobsPage"));
const JobDetailPage = lazy(() => import("@/features/jobs/pages/JobDetailPage"));
const MessagesPage = lazy(() => import("@/features/messages/pages/MessagesPage"));
const ActorDashboardPage = lazy(() => import("@/features/dashboard/pages/ActorDashboardPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const OrgManagementPage = lazy(() => import("@/features/organizations/pages/OrgManagementPage"));
const AdminReviewPage = lazy(() => import("@/features/organizations/pages/AdminReviewPage"));
const CourseBuilderPage = lazy(() => import("@/features/courses/pages/CourseBuilderPage"));
const OrganizationProfilePage = lazy(() => import("@/features/organizations/pages/OrganizationProfilePage"));
const PublicOrganizationProfilePage = lazy(() => import("@/features/organizations/pages/PublicOrganizationProfilePage"));
const SkillPortfolioPage = lazy(() => import("@/features/skills/pages/SkillPortfolioPage"));
const SavedOpportunitiesPage = lazy(() => import("@/features/saved/pages/SavedOpportunitiesPage"));
const CommunitiesPage = lazy(() => import("@/features/communities/pages/CommunitiesPage"));
const CertificatesPage = lazy(() => import("@/features/certificates/pages/CertificatesPage"));
const CertificateDetailPage = lazy(() => import("@/features/certificates/pages/CertificateDetailPage"));
const PaymentsPage = lazy(() => import("@/features/payments/pages/PaymentsPage"));

export const guestRoutes = [
  { path: "/", element: <LandingPage />, access: "public" },
  { path: "/get-started", element: <GetStartedPage />, access: "public" },
  { path: "/login", element: <LoginPage />, access: "public" },
  { path: "/register", element: <RegisterPage />, access: "public" },
  { path: "/organizations/register", element: <OrganizationOnboardingPage />, access: "public" },
  { path: "/forgot-password", element: <ForgetPasswordPage />, access: "public" },
  { path: "/reset-password", element: <ResetPasswordPage />, access: "public" },
  { path: "/verify-email", element: <VerifyEmailPage />, access: "public" },
];

export const publicBrowseRoutes = [
  { path: "/discover", element: <DiscoverPage />, access: "public" },
  { path: "/courses", element: <CoursesPage />, access: "public" },
  { path: "/courses/:id", element: <CourseDetailPage />, access: "public" },
  { path: "/events", element: <EventsPage />, access: "public" },
  { path: "/events/:id", element: <EventDetailPage />, access: "public" },
  { path: "/jobs", element: <JobsPage />, access: "public" },
  { path: "/jobs/:id", element: <JobDetailPage />, access: "public" },
  { path: "/communities", element: <CommunitiesPage />, access: "public" },
  { path: "/certificates", element: <CertificatesPage />, access: "public" },
  { path: "/certificates/:id", element: <CertificateDetailPage />, access: "public" },
  { path: "/organizations/:id", element: <PublicOrganizationProfilePage />, access: "public" },
];

export const appRoutes = [
  {
    path: "/welcome",
    element: <OnboardingPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  {
    path: "/skill-swap",
    element: <SkillSwapPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  {
    path: "/messages",
    element: <MessagesPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  { path: "/dashboard", element: <ActorDashboardPage />, access: "authenticated" },
  {
    path: "/profile",
    element: <ProfilePage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  {
    path: "/org",
    element: <OrgManagementPage />,
    access: "authenticated",
    allowedRoles: [roles.organization],
  },
  {
    path: "/admin",
    element: <AdminReviewPage />,
    access: "authenticated",
    allowedRoles: [roles.admin],
  },
  {
    path: "/course-builder",
    element: <CourseBuilderPage />,
    access: "authenticated",
    allowedRoles: [roles.organization],
  },
  {
    path: "/organization-profile",
    element: <OrganizationProfilePage />,
    access: "authenticated",
    allowedRoles: [roles.organization],
  },
  {
    path: "/skill-portfolio",
    element: <SkillPortfolioPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  {
    path: "/saved-opportunities",
    element: <SavedOpportunitiesPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser],
  },
  {
    path: "/payments",
    element: <PaymentsPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.organization, roles.admin],
  },
];
