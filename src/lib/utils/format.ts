import * as Localization from 'expo-localization';

const getDeviceTimeInfo = () => {
    const locale = Localization.getLocales()[0];
    const calendar = Localization.getCalendars()[0];
    return {
        timeZone: calendar?.timeZone,
        region: locale?.regionCode,
        language: locale?.languageCode,
        calendar: calendar?.calendar,
        uses24hourClock: calendar?.uses24hourClock,
    };
};

export default getDeviceTimeInfo;