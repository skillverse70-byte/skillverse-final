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
const OrganizationOnboardingPage = lazy(() =>
  import("@/features/onboarding/pages/OrganizationOnboardingPage"));
const SkillSwapPage = lazy(() => import("@/features/skills/pages/SkillSwapPage"));
const EventsPage = lazy(() => import("@/features/events/pages/EventsPage"));
const EventDetailPage = lazy(() => import("@/features/events/pages/EventDetailPage"));
const JobsPage = lazy(() => import("@/features/jobs/pages/JobsPage"));
const JobDetailPage = lazy(() => import("@/features/jobs/pages/JobDetailPage"));
const MessagesPage = lazy(() => import("@/features/messages/pages/MessagesPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const OrgManagementPage = lazy(() => import("@/features/organizations/pages/OrgManagementPage"));
const AdminReviewPage = lazy(() => import("@/features/organizations/pages/AdminReviewPage"));
const CourseBuilderPage = lazy(() => import("@/features/courses/pages/CourseBuilderPage"));
const OrganizationProfilePage = lazy(() => import("@/features/organizations/pages/OrganizationProfilePage"));
const PublicOrganizationProfilePage = lazy(() => import("@/features/organizations/pages/PublicOrganizationProfilePage"));
const SkillPortfolioPage = lazy(() => import("@/features/skills/pages/SkillPortfolioPage"));
const SavedOpportunitiesPage = lazy(() => import("@/features/saved/pages/SavedOpportunitiesPage"));

export const guestRoutes = [
  { path: "/", element: <LandingPage />, access: "public" },
  { path: "/get-started", element: <GetStartedPage />, access: "public" },
  { path: "/login", element: <LoginPage />, access: "public" },
  { path: "/register", element: <RegisterPage />, access: "public" },
  { path: "/organizations/register", element: <OrganizationOnboardingPage />, access: "public" },
  { path: "/forgot-password", element: <ForgetPasswordPage />, access: "public" },
  { path: "/reset-password", element: <ResetPasswordPage />, access: "public" },
];

export const publicBrowseRoutes = [
  { path: "/discover", element: <DiscoverPage />, access: "public" },
  { path: "/courses", element: <CoursesPage />, access: "public" },
  { path: "/courses/:id", element: <CourseDetailPage />, access: "public" },
  { path: "/events", element: <EventsPage />, access: "public" },
  { path: "/events/:id", element: <EventDetailPage />, access: "public" },
  { path: "/jobs", element: <JobsPage />, access: "public" },
  { path: "/jobs/:id", element: <JobDetailPage />, access: "public" },
  { path: "/organizations/:id", element: <PublicOrganizationProfilePage />, access: "public" },
];

export const appRoutes = [
  {
    path: "/welcome",
    element: <OnboardingPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.admin],
  },
  {
    path: "/skill-swap",
    element: <SkillSwapPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.admin],
  },
  { path: "/messages", element: <MessagesPage />, access: "authenticated" },
  { path: "/dashboard", element: <DashboardPage />, access: "authenticated" },
  {
    path: "/profile",
    element: <ProfilePage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.admin],
  },
  {
    path: "/org",
    element: <OrgManagementPage />,
    access: "authenticated",
    allowedRoles: [roles.organization, roles.admin],
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
    allowedRoles: [roles.organization, roles.admin],
  },
  {
    path: "/organization-profile",
    element: <OrganizationProfilePage />,
    access: "authenticated",
    allowedRoles: [roles.organization, roles.admin],
  },
  {
    path: "/skill-portfolio",
    element: <SkillPortfolioPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.admin],
  },
  {
    path: "/saved-opportunities",
    element: <SavedOpportunitiesPage />,
    access: "authenticated",
    allowedRoles: [roles.regularUser, roles.admin],
  },
];
