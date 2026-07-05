import { appRuntime, isLocalDemoMode } from "@/lib/runtime-config";
import { isBackendApiMode } from "@/lib/runtime-config";
import { backendAuthClient } from "@/services/auth/backend-auth-client";

const STORAGE_PREFIX = appRuntime.storagePrefix;
const DEMO_AUTO_LOGIN = appRuntime.demo.autoLogin;
const DEMO_EMAIL = appRuntime.demo.email;
const DEMO_PASSWORD = appRuntime.demo.password;
const DEMO_OTP = appRuntime.demo.otp;

const memoryStorage = new Map();

const storage = typeof window === "undefined"
  ? {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => memoryStorage.set(key, value),
      removeItem: (key) => memoryStorage.delete(key),
    }
  : window.localStorage;

const nowIso = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = (prefix) =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const keyFor = (name) => `${STORAGE_PREFIX}:${name}`;

const read = (name, fallback) => {
  const value = storage.getItem(keyFor(name));
  if (!value) {
    return clone(fallback);
  }
  try {
    return JSON.parse(value);
  } catch {
    return clone(fallback);
  }
};

const write = (name, value) => {
  storage.setItem(keyFor(name), JSON.stringify(value));
  return value;
};

const seedDatabase = () => {
  if (storage.getItem(keyFor(appRuntime.storageKeys.seeded)) === "true") {
    return;
  }

  const demoUserId = "user_demo";
  const adminUserId = "user_admin";
  const mentorUserId = "user_mentor";
  const orgId = "org_skillverse";
  const pendingOrgId = "org_pending";
  const courseId = "course_react";
  const courseId2 = "course_data";
  const eventId = "event_portfolio";
  const eventId2 = "event_ai";
  const jobId = "job_frontend";
  const jobId2 = "job_marketing";
  const conversationId = "conversation_welcome";

  write("users", [
    {
      id: demoUserId,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      full_name: "Demo Learner",
      role: "admin",
      created_date: nowIso(),
    },
    {
      id: adminUserId,
      email: "admin@skillverse.local",
      password: "Admin123!",
      full_name: "Platform Admin",
      role: "admin",
      created_date: nowIso(),
    },
    {
      id: mentorUserId,
      email: "mentor@skillverse.local",
      password: "Mentor123!",
      full_name: "Maya Mentor",
      role: "user",
      created_date: nowIso(),
    },
  ]);

  write("entities", {
    UserProfile: [
      {
        id: "profile_demo",
        user_id: demoUserId,
        display_name: "Demo Learner",
        bio: "Frontend learner building a stronger portfolio through guided practice.",
        location: "Addis Ababa",
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Skill: [
      { id: "skill_react", name: "React", category: "Programming", is_approved: true, created_date: nowIso() },
      { id: "skill_figma", name: "Figma", category: "Design", is_approved: true, created_date: nowIso() },
      { id: "skill_sql", name: "SQL", category: "Data Science", is_approved: true, created_date: nowIso() },
      { id: "skill_marketing", name: "Content Marketing", category: "Marketing", is_approved: true, created_date: nowIso() },
      { id: "skill_storytelling", name: "Storytelling", category: "Writing", is_approved: false, created_date: nowIso() },
    ],
    Course: [
      {
        id: courseId,
        title: "React Foundations for Real Projects",
        description: "Build a complete React workflow with components, routing, forms, and local state.",
        category: "Programming",
        difficulty: "beginner",
        is_free: true,
        price: 0,
        status: "published",
        enrollment_open: true,
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        instructor_name: "Maya Mentor",
        total_lessons: 4,
        total_duration_hours: 3.5,
        enrolled_count: 128,
        rating: 4.8,
        tags: ["react", "frontend"],
        modules: [
          {
            title: "Getting Started",
            order: 1,
            lessons: [
              { title: "JSX and Components", type: "video", duration_minutes: 35 },
              { title: "Props and State", type: "reading", duration_minutes: 25 },
            ],
          },
          {
            title: "Build the App",
            order: 2,
            lessons: [
              { title: "Routing Basics", type: "video", duration_minutes: 30 },
              { title: "Project Checkpoint", type: "assignment", duration_minutes: 20 },
            ],
          },
        ],
        created_date: nowIso(),
        updated_date: nowIso(),
      },
      {
        id: courseId2,
        title: "Data Skills for Product Teams",
        description: "Learn dashboards, SQL basics, and practical analytics communication.",
        category: "Data Science",
        difficulty: "intermediate",
        is_free: false,
        price: 49,
        status: "published",
        enrollment_open: true,
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        instructor_name: "Samuel Data",
        total_lessons: 6,
        total_duration_hours: 5,
        enrolled_count: 72,
        rating: 4.6,
        tags: ["sql", "analytics"],
        modules: [
          {
            title: "Analytics Basics",
            order: 1,
            lessons: [
              { title: "Metrics That Matter", type: "video", duration_minutes: 40 },
              { title: "SQL Warmup", type: "quiz", duration_minutes: 15 },
            ],
          },
        ],
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Event: [
      {
        id: eventId,
        title: "Portfolio Review Live Session",
        description: "Bring your portfolio and get practical feedback from hiring managers.",
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        is_online: true,
        is_free: true,
        status: "upcoming",
        current_attendees: 45,
        max_attendees: 100,
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        is_verified: true,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
      {
        id: eventId2,
        title: "AI for Career Growth Meetup",
        description: "A local meetup for using AI tools responsibly in your job search.",
        event_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
        is_online: false,
        location: "Nairobi Innovation Hub",
        is_free: true,
        status: "upcoming",
        current_attendees: 28,
        max_attendees: 60,
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        is_verified: true,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Job: [
      {
        id: jobId,
        title: "Junior Frontend Developer",
        description: "Support a product team building polished web experiences.",
        company_name: "BrightPath Labs",
        location: "Remote",
        is_remote: true,
        type: "full_time",
        status: "open",
        salary_range: "$900 - $1,400 / month",
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        is_verified: true,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
      {
        id: jobId2,
        title: "Marketing Intern",
        description: "Help plan campaigns, write copy, and measure performance.",
        company_name: "Northwind Studio",
        location: "Addis Ababa",
        is_remote: false,
        type: "internship",
        status: "open",
        salary_range: "Stipend available",
        organization_id: orgId,
        organization_name: "SkillVerse Academy",
        is_verified: true,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    SkillSwap: [
      {
        id: "swap_1",
        requester_skill_name: "React",
        responder_skill_name: "UI Design",
        responder_name: "Maya Mentor",
        status: "matched",
        created_date: nowIso(),
      },
      {
        id: "swap_2",
        requester_skill_name: "Public Speaking",
        responder_skill_name: "",
        responder_name: "",
        status: "open",
        created_date: nowIso(),
      },
    ],
    UserSkill: [
      {
        id: "userskill_1",
        user_id: demoUserId,
        skill_name: "React",
        level: "intermediate",
        years_experience: 1,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
      {
        id: "userskill_2",
        user_id: demoUserId,
        skill_name: "Figma",
        level: "beginner",
        years_experience: 0.5,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    SavedItem: [
      {
        id: "saved_1",
        user_id: demoUserId,
        item_id: courseId2,
        item_type: "course",
        created_date: nowIso(),
      },
      {
        id: "saved_2",
        user_id: demoUserId,
        item_id: jobId,
        item_type: "job",
        created_date: nowIso(),
      },
    ],
    Enrollment: [
      {
        id: "enrollment_1",
        user_id: demoUserId,
        course_id: courseId,
        progress_percent: 42,
        status: "active",
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    JobApplication: [
      {
        id: "application_1",
        user_id: demoUserId,
        job_id: jobId,
        status: "submitted",
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    RSVP: [
      {
        id: "rsvp_1",
        user_id: demoUserId,
        event_id: eventId,
        status: "going",
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Organization: [
      {
        id: orgId,
        owner_id: demoUserId,
        name: "SkillVerse Academy",
        description: "A learning community focused on employable digital skills.",
        logo_url: "",
        website: "https://skillverse.local",
        category: "Education",
        contact_email: "hello@skillverse.local",
        verification_status: "verified",
        is_verified: true,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
      {
        id: pendingOrgId,
        owner_id: mentorUserId,
        name: "Mentor Circle",
        description: "Community-led workshops for confidence and career growth.",
        logo_url: "",
        website: "",
        category: "Coaching",
        contact_email: "team@mentorcircle.local",
        verification_status: "pending",
        is_verified: false,
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Conversation: [
      {
        id: conversationId,
        participant_ids: [demoUserId, mentorUserId],
        title: "Welcome to SkillVerse",
        last_message_preview: "Let me know what you want to learn next.",
        last_message_date: nowIso(),
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
    Message: [
      {
        id: "message_1",
        conversation_id: conversationId,
        sender_id: mentorUserId,
        sender_name: "Maya Mentor",
        content: "Welcome! Start with the React path and we can build from there.",
        created_date: nowIso(),
        updated_date: nowIso(),
      },
    ],
  });

  storage.setItem(keyFor(appRuntime.storageKeys.seeded), "true");
};

const readUsers = () => read(appRuntime.storageKeys.users, []);
const writeUsers = (users) => write(appRuntime.storageKeys.users, users);
const readEntities = () => read(appRuntime.storageKeys.entities, {});
const writeEntities = (entities) => write(appRuntime.storageKeys.entities, entities);

const normalizeValue = (value) => {
  if (typeof value === "string") {
    return value.toLowerCase();
  }
  return value;
};

const matchesQuery = (record, query) =>
  Object.entries(query || {}).every(([key, expected]) => {
    const actual = record[key];
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    if (typeof expected === "string" && typeof actual === "string") {
      return normalizeValue(actual).includes(normalizeValue(expected));
    }
    return actual === expected;
  });

const sortRecords = (records, order) => {
  if (!order) {
    return [...records];
  }

  const desc = order.startsWith("-");
  const field = desc ? order.slice(1) : order;
  return [...records].sort((a, b) => {
    if (a[field] === b[field]) {
      return 0;
    }
    if (a[field] == null) {
      return 1;
    }
    if (b[field] == null) {
      return -1;
    }
    if (a[field] > b[field]) {
      return desc ? -1 : 1;
    }
    return desc ? 1 : -1;
  });
};

const getCollection = (entityName) => {
  seedDatabase();
  const entities = readEntities();
  return entities[entityName] || [];
};

const saveCollection = (entityName, nextCollection) => {
  const entities = readEntities();
  entities[entityName] = nextCollection;
  writeEntities(entities);
};

const enrichRecord = (entityName, record) => {
  const normalized = {
    ...record,
    updated_date: nowIso(),
  };

  if (entityName === "Conversation") {
    normalized.last_message_date = normalized.last_message_date || nowIso();
  }

  return normalized;
};

const createEntityApi = (entityName) => ({
  async list(order, limit) {
    const items = sortRecords(getCollection(entityName), order);
    return clone(typeof limit === "number" ? items.slice(0, limit) : items);
  },
  async filter(query, order, limit) {
    const items = getCollection(entityName).filter((record) => matchesQuery(record, query));
    const sorted = sortRecords(items, order);
    return clone(typeof limit === "number" ? sorted.slice(0, limit) : sorted);
  },
  async get(id) {
    const item = getCollection(entityName).find((record) => record.id === id);
    return item ? clone(item) : null;
  },
  async create(payload) {
    const collection = getCollection(entityName);
    const record = enrichRecord(entityName, {
      id: makeId(entityName.toLowerCase()),
      created_date: nowIso(),
      ...payload,
    });
    saveCollection(entityName, [record, ...collection]);
    return clone(record);
  },
  async update(id, updates) {
    const collection = getCollection(entityName);
    let updatedRecord = null;
    const nextCollection = collection.map((record) => {
      if (record.id !== id) {
        return record;
      }
      updatedRecord = enrichRecord(entityName, {
        ...record,
        ...updates,
      });
      return updatedRecord;
    });
    saveCollection(entityName, nextCollection);
    return clone(updatedRecord);
  },
  async delete(id) {
    const collection = getCollection(entityName);
    saveCollection(
      entityName,
      collection.filter((record) => record.id !== id),
    );
    return true;
  },
});

const getCurrentUser = () => {
  const users = readUsers();
  const currentUserId = read(appRuntime.storageKeys.currentUserId, null);
  if (currentUserId) {
    return users.find((user) => user.id === currentUserId) || null;
  }
  if (isLocalDemoMode() && DEMO_AUTO_LOGIN) {
    const demoUser = users.find((user) => user.email === DEMO_EMAIL) || null;
    if (demoUser) {
      write(appRuntime.storageKeys.currentUserId, demoUser.id);
      return demoUser;
    }
  }
  return null;
};

const setCurrentUser = (user) => {
  write(appRuntime.storageKeys.currentUserId, user?.id || null);
  write(appRuntime.storageKeys.token, user ? `token-${user.id}` : null);
};

const requireUser = () => {
  const user = getCurrentUser();
  if (!user) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }
  return user;
};

const auth = {
  async me() {
    if (isBackendApiMode()) {
      return backendAuthClient.me();
    }
    return clone(requireUser());
  },
  async loginViaEmailPassword(email, password) {
    if (isBackendApiMode()) {
      return backendAuthClient.loginViaEmailPassword(email, password);
    }
    const user = readUsers().find(
      (candidate) =>
        candidate.email.toLowerCase() === email.toLowerCase() &&
        candidate.password === password,
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }
    setCurrentUser(user);
    return clone(user);
  },
  async register({ email, password }) {
    if (isBackendApiMode()) {
      return backendAuthClient.register({ email, password });
    }
    const users = readUsers();
    if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    write(appRuntime.storageKeys.pendingRegistration, {
      id: makeId("user"),
      email,
      password,
      full_name: email.split("@")[0],
      role: "user",
      otp: DEMO_OTP,
    });
    return { success: true };
  },
  async verifyOtp({ email, otpCode }) {
    if (isBackendApiMode()) {
      return backendAuthClient.verifyEmail({ email, code: otpCode });
    }
    const pendingRegistration = read(appRuntime.storageKeys.pendingRegistration, null);
    if (
      !pendingRegistration ||
      pendingRegistration.email.toLowerCase() !== email.toLowerCase() ||
      otpCode !== pendingRegistration.otp
    ) {
      throw new Error("Invalid verification code");
    }
    const users = readUsers();
    const newUser = {
      id: pendingRegistration.id,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      full_name: pendingRegistration.full_name,
      role: pendingRegistration.role,
      created_date: nowIso(),
    };
    writeUsers([newUser, ...users]);
    write(appRuntime.storageKeys.pendingRegistration, null);
    setCurrentUser(newUser);
    return { access_token: `token-${newUser.id}` };
  },
  async resendOtp(email) {
    if (isBackendApiMode()) {
      return backendAuthClient.resendVerification(email);
    }
    return { success: true };
  },
  loginWithProvider(_provider, redirectPath = "/") {
    if (isBackendApiMode()) {
      return backendAuthClient.loginWithProvider(_provider, redirectPath);
    }
    const user = readUsers().find((candidate) => candidate.email === DEMO_EMAIL);
    if (user) {
      setCurrentUser(user);
    }
    if (typeof window !== "undefined") {
      window.location.href = redirectPath;
    }
  },
  logout(redirectPath) {
    if (isBackendApiMode()) {
      return backendAuthClient.logout(redirectPath);
    }
    write(appRuntime.storageKeys.currentUserId, null);
    write(appRuntime.storageKeys.token, null);
    if (typeof window !== "undefined" && redirectPath) {
      window.location.href = redirectPath;
    }
  },
  redirectToLogin(fromUrl) {
    if (isBackendApiMode()) {
      return backendAuthClient.redirectToLogin(fromUrl);
    }
    if (typeof window !== "undefined") {
      const target = fromUrl ? `/login?from=${encodeURIComponent(fromUrl)}` : "/login";
      window.location.href = target;
    }
  },
  async resetPasswordRequest(email) {
    if (isBackendApiMode()) {
      return backendAuthClient.requestPasswordReset(email);
    }
    return { success: true, otp_hint: DEMO_OTP };
  },
  async resetPassword({ resetToken, newPassword }) {
    if (isBackendApiMode()) {
      return backendAuthClient.resetPassword({
        token: resetToken,
        newPassword,
      });
    }
    const user = requireUser();
    const users = readUsers().map((candidate) =>
      candidate.id === user.id ? { ...candidate, password: newPassword } : candidate,
    );
    writeUsers(users);
    return { success: true };
  },
  setToken(token) {
    if (isBackendApiMode()) {
      backendAuthClient.setToken(token);
      return;
    }
    write("token", token);
  },
};

const entityNames = [
  "Conversation",
  "Course",
  "Enrollment",
  "Event",
  "Job",
  "JobApplication",
  "Message",
  "Organization",
  "RSVP",
  "SavedItem",
  "Skill",
  "SkillSwap",
  "UserProfile",
  "UserSkill",
];

const entities = Object.fromEntries(
  entityNames.map((entityName) => [entityName, createEntityApi(entityName)]),
);

export const appClient = {
  runtime: {
    appMode: appRuntime.appMode,
    usesMockData: isLocalDemoMode(),
    apiBaseUrl: appRuntime.apiBaseUrl,
    wsBaseUrl: appRuntime.wsBaseUrl,
  },
  auth,
  entities,
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
          return {
            file_url: URL.createObjectURL(file),
          };
        }
        return {
          file_url: "",
        };
      },
    },
  },
};
