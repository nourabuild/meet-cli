import { Auths } from "./auths";
import { Follows } from "./follows";
import { Users } from "./users";
import { Meetings } from "./meetings";
import { Calendars } from "./calendars";


export interface AuthRepository {
    AuthenticateUser: (formData: FormData) => Promise<Auths.Response>;
    CreateUser: (formData: FormData) => Promise<Auths.Response>;
}

export interface UserRepository {
    GetByAccount: (account: string, token: string) => Promise<Users.Response>;
    WhoAmI: (token: string) => Promise<Users.Response>;
    SearchUsers: (query: string, token: string, signal: AbortSignal) => Promise<Users.SearchResponse>;
    UpdateUser: (formData: FormData, token: string) => Promise<Users.Response>;
};

// calendar_service.create_exception(
//     current_user.id,
//     exception_data.exception_date,
//     exception_data.recurrence_type,
//     exception_data.interval,
//     exception_data.is_full_day,
//     exception_data.is_available,
// )

export interface CalendarRepository {
    GetUserWeeklyAvailability: (token: string) => Promise<Calendars.Response>;
    GetUserExceptionDates: (token: string) => Promise<Calendars.Response>;
    GetOnboardingStatus: (token: string) => Promise<Calendars.OnboardingResponse>;
    AddUserWeeklyAvailability: (dayOfWeek: number, intervals: Calendars.TimeInterval[], token: string) => Promise<Calendars.Response>;
    AddUserExceptionDate: (exception_date: string, recurrence_type: string, interval: Calendars.TimeInterval, is_full_day: boolean, is_available: boolean, token: string) => Promise<Calendars.Response>;
    // DO NOT IMPLEMENT DELETE FUNCTION, API DOES NOT HAVE IT
    // DeleteUserWeeklyAvailabilityById: (calendarId: string, token: string) => Promise<Calendars.Response>;
    DeleteUserExceptionDate: (id: string, token: string) => Promise<Calendars.Response>;
}

export interface FollowRepository {
    FollowUser: (id: string, token: string) => Promise<Follows.Response>;
    UnfollowUser: (id: string, token: string) => Promise<Follows.Response>;
    GetFollowers: (id: string, token: string) => Promise<Follows.Response>;
    GetFollowing: (id: string, token: string) => Promise<Follows.Response>;
    GetUsersFollowCount: (id: string, token: string) => Promise<Follows.Response>;
}

export interface MeetingRepository {
    GetMeetings: (status: string, token: string) => Promise<Meetings.Response>;
    GetMeetingsRequests(status: string, token: string): Promise<Meetings.Response>;
    ApproveMeetingByParticipant: (id: string, token: string) => Promise<Meetings.Response>;
    RejectMeetingByParticipant: (id: string, token: string) => Promise<Meetings.Response>;
    CreateMeetingWithParticipants: (formData: FormData, token: string) => Promise<Meetings.Response>;
    GetMeetingById: (id: string, token: string) => Promise<Meetings.Response>;
    GetParticipantsByMeetingId: (id: string, token: string) => Promise<Meetings.Response>;
    DeleteMeetingById: (id: string, token: string) => Promise<Meetings.Response>;
    AddParticipant: (formData: FormData, token: string) => Promise<Meetings.Response>;
    DeleteParticipant: (formData: string, token: string) => Promise<Meetings.Response>;
}
