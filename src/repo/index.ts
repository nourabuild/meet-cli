import NewAuthRepository from "./auths";
import NewUserRepository from "./users";
import NewFollowRepository from "./follows";
import NewMeetingRepository from "./meetings";
import NewCalendarRepository from "./calendars";


import { AuthRepository, UserRepository, FollowRepository, MeetingRepository, CalendarRepository } from "./repository";

export const host = "https://api.noura.software";
// export const host = "http://localhost:8000";

const AuthRepo = NewAuthRepository(host);
const UserRepo = NewUserRepository(host);
const FollowRepo = NewFollowRepository(host);
const MeetingRepo = NewMeetingRepository(host);
const CalendarRepo = NewCalendarRepository(host);

export { AuthRepo, UserRepo, FollowRepo, MeetingRepo, CalendarRepo };

export type { AuthRepository, UserRepository, FollowRepository, MeetingRepository, CalendarRepository };

// export const host = import.meta.env.VITE_API_HOST || 'http://localhost:8080';
// export const minio = import.meta.env.VITE_MINIO_HOST || 'http://localhost:9000/meetx';
