import React, { useReducer, useState } from "react";
import CalendarStepOnboarding, { createEmptyWeeklySchedule, WeeklySchedule, cloneWeeklySchedule } from "./Calendar";
import SettingsStepOnboarding from "./Settings";

type OnboardingStep = "calendar" | "settings";

type OnboardingAction =
    | { type: "GOTO_CALENDAR" }
    | { type: "GOTO_SETTINGS" };

const onboardingReducer = (_state: OnboardingStep, action: OnboardingAction): OnboardingStep => {
    switch (action.type) {
        case "GOTO_SETTINGS":
            return "settings";
        case "GOTO_CALENDAR":
        default:
            return "calendar";
    }
};

function Onboarding() {
    const [step, dispatch] = useReducer(onboardingReducer, "calendar");
    const [scheduleDraft, setScheduleDraft] = useState<WeeklySchedule[]>(createEmptyWeeklySchedule());

    const handleCalendarContinue = (schedule: WeeklySchedule[]) => {
        setScheduleDraft(cloneWeeklySchedule(schedule));
        dispatch({ type: "GOTO_SETTINGS" });
    };

    const handleSettingsBack = () => {
        dispatch({ type: "GOTO_CALENDAR" });
    };

    return step === "calendar"
        ? (
            <CalendarStepOnboarding
                initialSchedule={scheduleDraft}
                onContinue={handleCalendarContinue}
            />
        ) : (
            <SettingsStepOnboarding
                onBack={handleSettingsBack}
                schedule={scheduleDraft}
            />
        );
}

export default Onboarding;
