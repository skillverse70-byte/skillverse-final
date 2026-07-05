import { lazy } from "react";
import { roles } from "@/lib/domain-enums";

const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const OnboardingPage = lazy(() => import("@/features/onboarding/pages/OnboardingPage"));
const DiscoverPage = lazy(() => import("@/features/skills/pages/DiscoverPage"));
const CoursesPage = lazy(() => import("@/features/courses/pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/features/courses/pages/CourseDetailPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ForgetPasswordPage = lazy(() => import("@/features/auth/pages/ForgetPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
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
const SkillPortfolioPage = lazy(() => import("@/features/skills/pages/SkillPortfolioPage"));
const SavedOpportunitiesPage = lazy(() => import("@/features/saved/pages/SavedOpportunitiesPage"));

export const publicRoutes = [
  { path: "/", element: <LandingPage />, access: "public" },
  { path: "/onboarding", element: <OnboardingPage />, access: "public" },
  { path: "/login", element: <LoginPage />, access: "public" },
  { path: "/register", element: <RegisterPage />, access: "public" },
  { path: "/forgot-password", element: <ForgetPasswordPage />, access: "public" },
  { path: "/reset-password", element: <ResetPasswordPage />, access: "public" },
];

export const appRoutes = [
  { path: "/discover", element: <DiscoverPage />, access: "authenticated" },
  { path: "/courses", element: <CoursesPage />, access: "authenticated" },
  { path: "/courses/:id", element: <CourseDetailPage />, access: "authenticated" },
  { path: "/skill-swap", element: <SkillSwapPage />, access: "authenticated" },
  { path: "/events", element: <EventsPage />, access: "authenticated" },
  { path: "/events/:id", element: <EventDetailPage />, access: "authenticated" },
  { path: "/jobs", element: <JobsPage />, access: "authenticated" },
  { path: "/jobs/:id", element: <JobDetailPage />, access: "authenticated" },
  { path: "/messages", element: <MessagesPage />, access: "authenticated" },
  { path: "/dashboard", element: <DashboardPage />, access: "authenticated" },
  { path: "/profile", element: <ProfilePage />, access: "authenticated" },
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
  { path: "/skill-portfolio", element: <SkillPortfolioPage />, access: "authenticated" },
  { path: "/saved-opportunities", element: <SavedOpportunitiesPage />, access: "authenticated" },
];
