import React, { useReducer } from "react";
import CalendarStepOnboarding from "./Calendar";
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

    const handleCalendarSuccess = () => {
        dispatch({ type: "GOTO_SETTINGS" });
    };

    const handleSettingsBack = () => {
        dispatch({ type: "GOTO_CALENDAR" });
    };

    return step === "calendar"
        ? <CalendarStepOnboarding onSuccess={handleCalendarSuccess} />
        : <SettingsStepOnboarding onBack={handleSettingsBack} />;
}

export default Onboarding;
