export const convertUtcToLocalHHMM = (time: string): string => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time ?? '');
    if (!match) return time;

    const [, hour, minute] = match;
    const reference = new Date();
    reference.setUTCHours(Number(hour), Number(minute), 0, 0);

    const localHours = reference.getHours().toString().padStart(2, '0');
    const localMinutes = reference.getMinutes().toString().padStart(2, '0');

    return `${localHours}:${localMinutes}`;
};

export const formatPartialTime = (input: string): string => {
    const digits = input.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export const isValidTime = (t: string): boolean => {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
};
