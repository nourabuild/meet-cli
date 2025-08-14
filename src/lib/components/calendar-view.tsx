import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';


interface CalendarViewProps {
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
    markedDates?: { [key: string]: { selected?: boolean; available?: boolean } };
    containerStyle?: object;
    defaultView?: 'month' | 'week';
    meetings?: any[];
}

export default function CalendarView({
    selectedDate = new Date(),
    onDateSelect,
    markedDates = {},
    containerStyle,
    defaultView = 'month',
    meetings = []
}: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>(defaultView);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const fullDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        d.setDate(diff);
        return d;
    };

    const getWeekEnd = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + 6;
        return new Date(d.setDate(diff));
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(currentMonth - 1);
        } else {
            newDate.setMonth(currentMonth + 1);
        }
        setCurrentDate(newDate);
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const navigateDay = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setCurrentDate(newDate);
    };

    const navigate = (direction: 'prev' | 'next') => {
        if (viewMode === 'month') {
            navigateMonth(direction);
        } else {
            navigateWeek(direction);
        }
    };

    const formatDateKey = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const isToday = (checkDate: Date) => {
        return (
            checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (checkDate: Date) => {
        return (
            checkDate.getDate() === selectedDate.getDate() &&
            checkDate.getMonth() === selectedDate.getMonth() &&
            checkDate.getFullYear() === selectedDate.getFullYear()
        );
    };

    const handleDatePress = (date: Date) => {
        onDateSelect?.(date);
    };

    const renderWeekView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const weekStart = getWeekStart(currentDate);
        const days: Date[] = [];

        // Generate week days for header
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
            days.push(date);
        }

        return (
            <View>
                {/* Week day headers (like in week view) */}
                <View style={styles.weekHeaders}>
                    <View style={styles.timeColumn} />
                    {days.map((date, index) => {
                        const dateKey = formatDateKey(date);
                        const marked = markedDates[dateKey];
                        const isCurrentDay = isToday(date);
                        const isSelectedDay = isSelected(date);

                        return (
                            <TouchableOpacity
                                key={`day-header-${index}`}
                                style={styles.weekDayHeader}
                                onPress={() => handleDatePress(date)}
                            >
                                <Text style={[styles.weekDayName, { color: textColor }]}>
                                    {fullDayNames[date.getDay()]}
                                </Text>
                                <View
                                    style={[
                                        styles.weekDayNumber,
                                        isCurrentDay && styles.todayCell,
                                        isSelectedDay && styles.selectedCell,
                                        marked && marked.available && styles.availableCell,
                                        marked && !marked.available && styles.unavailableCell
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.weekDayNumberText,
                                            { color: textColor },
                                            isCurrentDay && styles.todayText,
                                            isSelectedDay && styles.selectedText,
                                            marked && marked.available && styles.availableText,
                                            marked && !marked.available && styles.unavailableText
                                        ]}
                                    >
                                        {date.getDate()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Time slots for selected day only */}
                <ScrollView style={styles.dayGrid} showsVerticalScrollIndicator={false}>
                    {hours.map((hour) => {
                        // Find meetings for this hour and selected date
                        const selectedDateString = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
                        const hourMeetings = meetings.filter(meeting => {
                            const meetingDate = new Date(meeting.start_time);
                            const meetingDateString = meetingDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
                            const meetingHour = meetingDate.getHours();
                            return meetingDateString === selectedDateString && meetingHour === hour;
                        });

                        return (
                            <View key={`day-hour-${hour}`} style={styles.dayHourSlot}>
                                <View style={styles.dayTimeColumn}>
                                    <Text style={[styles.dayTimeText, { color: textColor }]}>
                                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                    </Text>
                                </View>
                                <View style={[styles.dayTimeSlot, { borderTopColor: borderColor }]}>
                                    {hourMeetings.map((meeting, index) => (
                                        <TouchableOpacity
                                            key={`meeting-${meeting.id}-${index}`}
                                            style={[styles.meetingSlot, { backgroundColor: '#3B82F6' }]}
                                            onPress={() => {
                                                // Handle meeting press
                                                console.log('Meeting pressed:', meeting.title);
                                            }}
                                        >
                                            <Text style={[styles.meetingSlotTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
                                                {meeting.title}
                                            </Text>
                                            <Text style={[styles.meetingSlotTime, { color: '#E0E7FF' }]} numberOfLines={1}>
                                                {new Date(meeting.start_time).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };


    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <View key={`empty-prev-${i}`} style={styles.dayCellWrapper}>
                    <View style={styles.dayCell} />
                </View>
            );
        }

        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateKey = formatDateKey(date);
            const marked = markedDates[dateKey];
            const isCurrentDay = isToday(date);
            const isSelectedDay = isSelected(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            days.push(
                <View key={`current-${currentYear}-${currentMonth}-${day}`} style={styles.dayCellWrapper}>
                    <TouchableOpacity
                        style={[
                            styles.dayCell,
                            isCurrentDay && styles.todayCell,
                            isSelectedDay && styles.selectedCell,
                            marked && marked.available && styles.availableCell,
                            marked && !marked.available && styles.unavailableCell
                        ]}
                        onPress={() => handleDatePress(date)}
                    >
                        <Text
                            style={[
                                styles.dayText,
                                { color: textColor },
                                isWeekend && styles.weekendText,
                                isCurrentDay && styles.todayText,
                                isSelectedDay && styles.selectedText,
                                marked && marked.available && styles.availableText,
                                marked && !marked.available && styles.unavailableText
                            ]}
                        >
                            {day}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Add empty cells to complete the last row
        const totalCells = days.length;
        const remainingCells = 7 - (totalCells % 7);
        if (remainingCells < 7) {
            for (let i = 0; i < remainingCells; i++) {
                days.push(
                    <View key={`empty-${i}`} style={styles.dayCellWrapper}>
                        <View style={styles.dayCell} />
                    </View>
                );
            }
        }

        return (
            <View style={styles.monthGrid}>
                {days}
            </View>
        );
    };

    const getHeaderTitle = () => {
        if (viewMode === 'month') {
            return `${monthNames[currentMonth]} ${currentYear}`;
        } else {
            const weekStart = getWeekStart(currentDate);
            const weekEnd = getWeekEnd(currentDate);
            const startMonth = monthNames[weekStart.getMonth()];
            const endMonth = monthNames[weekEnd.getMonth()];

            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
                return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            } else {
                return `${startMonth} ${weekStart.getDate()}, ${weekStart.getFullYear()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: cardColor }, containerStyle]}>
            {/* View mode toggle */}
            <View style={[styles.viewToggle, { borderBottomColor: borderColor }]}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'month' && styles.toggleButtonActive,
                        viewMode === 'month' && { backgroundColor: borderColor }
                    ]}
                    onPress={() => setViewMode('month')}
                >
                    <Text style={[
                        styles.toggleText,
                        { color: textColor },
                        viewMode === 'month' && styles.toggleTextActive
                    ]}>
                        Month
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'week' && styles.toggleButtonActive,
                        viewMode === 'week' && { backgroundColor: borderColor }
                    ]}
                    onPress={() => setViewMode('week')}
                >
                    <Text style={[
                        styles.toggleText,
                        { color: textColor },
                        viewMode === 'week' && styles.toggleTextActive
                    ]}>
                        Week
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Navigation header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <TouchableOpacity
                    onPress={() => navigate('prev')}
                    style={styles.navButton}
                >
                    <Feather name="chevron-left" size={20} color={textColor} />
                </TouchableOpacity>

                <Text style={[styles.monthYear, { color: textColor }]}>
                    {getHeaderTitle()}
                </Text>

                <TouchableOpacity
                    onPress={() => navigate('next')}
                    style={styles.navButton}
                >
                    <Feather name="chevron-right" size={20} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Month view day headers */}
            {viewMode === 'month' && (
                <View style={styles.dayHeaders}>
                    {dayNames.map((dayName, index) => (
                        <View key={`header-${index}-${dayName}`} style={styles.dayHeaderWrapper}>
                            <Text style={[styles.dayHeader, { color: textColor }]}>
                                {dayName}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Render appropriate view */}
            {viewMode === 'month' ? renderMonthView() : renderWeekView()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    viewToggle: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    toggleTextActive: {
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    navButton: {
        padding: 8,
    },
    monthYear: {
        fontSize: 18,
        fontWeight: '600',
    },
    // Month view styles
    dayHeaders: {
        flexDirection: 'row',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    dayHeaderWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    dayHeader: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.7,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    dayCellWrapper: {
        width: '14.285714%', // Exactly 1/7
        alignItems: 'center',
        paddingVertical: 4,
    },
    dayCell: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20, // Half of width/height for perfect circle
    },
    dayText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    weekendText: {
        color: '#9CA3AF',
        opacity: 0.7,
    },
    // Week view styles
    weekHeaders: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    weekDayHeader: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekDayName: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.7,
        marginBottom: 4,
    },
    weekDayNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekDayNumberText: {
        fontSize: 16,
        fontWeight: '500',
    },
    weekGrid: {
        maxHeight: 400,
    },
    hourRow: {
        flexDirection: 'row',
        height: 60,
    },
    timeColumn: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 11,
        opacity: 0.6,
    },
    hourCells: {
        flex: 1,
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    hourCell: {
        flex: 1,
        borderLeftWidth: 1,
    },
    // Shared state styles
    todayCell: {
        backgroundColor: '#3B82F6',
    },
    todayText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    selectedCell: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    selectedText: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    availableCell: {
        backgroundColor: 'rgba(29, 78, 216, 0.1)',
        borderWidth: 2,
        borderColor: '#1D4ED8',
    },
    availableText: {
        color: '#1D4ED8',
        fontWeight: '600',
    },
    unavailableCell: {
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    unavailableText: {
        color: '#DC2626',
        fontWeight: '600',
    },
    // Day view styles
    dayViewHeader: {
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    dayViewHeaderButton: {
        alignItems: 'center',
    },
    dayViewDayName: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.7,
        marginBottom: 8,
    },
    dayViewDateNumber: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayViewDateText: {
        fontSize: 18,
        fontWeight: '600',
    },
    dayGrid: {
        maxHeight: 500,
    },
    dayHourSlot: {
        flexDirection: 'row',
        height: 80,
    },
    dayTimeColumn: {
        width: 80,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 8,
    },
    dayTimeText: {
        fontSize: 12,
        opacity: 0.6,
    },
    dayTimeSlot: {
        flex: 1,
        borderTopWidth: 1,
        marginLeft: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    meetingSlot: {
        borderRadius: 8,
        padding: 8,
        marginBottom: 4,
        minHeight: 50,
    },
    meetingSlotTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    meetingSlotTime: {
        fontSize: 12,
        fontWeight: '500',
    },
});


// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { Feather } from '@expo/vector-icons';
// import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';


// interface CalendarViewProps {
//     selectedDate?: Date;
//     onDateSelect?: (date: Date) => void;
//     markedDates?: { [key: string]: { selected?: boolean; available?: boolean } };
//     containerStyle?: object;
// }

// export default function CalendarView({ selectedDate = new Date(), onDateSelect, markedDates = {}, containerStyle }: CalendarViewProps) {
//     const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date());


//     const backgroundColor = useThemeColor({}, 'background');
//     const textColor = useThemeColor({}, 'text');
//     const cardColor = useThemeColor({}, 'card');
//     const borderColor = useThemeColor({}, 'border');

//     const today = new Date();
//     const currentMonth = currentDate.getMonth();
//     const currentYear = currentDate.getFullYear();

//     const monthNames = [
//         'January', 'February', 'March', 'April', 'May', 'June',
//         'July', 'August', 'September', 'October', 'November', 'December'
//     ];

//     const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

//     const getDaysInMonth = (month: number, year: number) => {
//         return new Date(year, month + 1, 0).getDate();
//     };

//     const getFirstDayOfMonth = (month: number, year: number) => {
//         return new Date(year, month, 1).getDay();
//     };

//     const navigateMonth = (direction: 'prev' | 'next') => {
//         const newDate = new Date(currentDate);
//         if (direction === 'prev') {
//             newDate.setMonth(currentMonth - 1);
//         } else {
//             newDate.setMonth(currentMonth + 1);
//         }
//         setCurrentDate(newDate);
//     };

//     const formatDateKey = (date: Date) => {
//         return date.toISOString().split('T')[0];
//     };

//     const isToday = (day: number) => {
//         return (
//             day === today.getDate() &&
//             currentMonth === today.getMonth() &&
//             currentYear === today.getFullYear()
//         );
//     };

//     const isSelected = (day: number) => {
//         return (
//             day === selectedDate.getDate() &&
//             currentMonth === selectedDate.getMonth() &&
//             currentYear === selectedDate.getFullYear()
//         );
//     };

//     const handleDatePress = (day: number) => {
//         const newDate = new Date(currentYear, currentMonth, day);
//         onDateSelect?.(newDate);
//     };

//     const renderMonthView = () => {
//         const daysInMonth = getDaysInMonth(currentMonth, currentYear);
//         const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
//         const days = [];

//         // Add empty cells for days before the first day of the month
//         for (let i = 0; i < firstDay; i++) {
//             days.push(
//                 <View key={`empty-prev-${i}`} style={styles.dayCellWrapper}>
//                     <View style={styles.dayCell} />
//                 </View>
//             );
//         }

//         // Add days of the current month
//         for (let day = 1; day <= daysInMonth; day++) {
//             const date = new Date(currentYear, currentMonth, day);
//             const dateKey = formatDateKey(date);
//             const marked = markedDates[dateKey];
//             const isCurrentDay = isToday(day);
//             const isSelectedDay = isSelected(day);
//             const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday (0) or Saturday (6)

//             days.push(
//                 <View key={`current-${currentYear}-${currentMonth}-${day}`} style={styles.dayCellWrapper}>
//                     <TouchableOpacity
//                         style={[
//                             styles.dayCell,
//                             isCurrentDay && styles.todayCell,
//                             isSelectedDay && styles.selectedCell,
//                             marked && marked.available && styles.availableCell,
//                             marked && !marked.available && styles.unavailableCell
//                         ]}
//                         onPress={() => handleDatePress(day)}
//                     >
//                         <Text
//                             style={[
//                                 styles.dayText,
//                                 { color: textColor },
//                                 isWeekend && styles.weekendText,
//                                 isCurrentDay && styles.todayText,
//                                 isSelectedDay && styles.selectedText,
//                                 marked && marked.available && styles.availableText,
//                                 marked && !marked.available && styles.unavailableText
//                             ]}
//                         >
//                             {day}
//                         </Text>
//                     </TouchableOpacity>
//                 </View>
//             );
//         }

//         // Add empty cells to complete the last row (optional, for consistent grid)
//         const totalCells = days.length;
//         const remainingCells = 7 - (totalCells % 7);
//         if (remainingCells < 7) {
//             for (let i = 0; i < remainingCells; i++) {
//                 days.push(
//                     <View key={`empty-${i}`} style={styles.dayCellWrapper}>
//                         <View style={styles.dayCell} />
//                     </View>
//                 );
//             }
//         }

//         return (
//             <View style={styles.monthGrid}>
//                 {days}
//             </View>
//         );
//     };


//     return (
//         <View style={[styles.container, { backgroundColor: cardColor }, containerStyle]}>
//             <View style={[styles.header, { borderBottomColor: borderColor }]}>
//                 <TouchableOpacity
//                     onPress={() => navigateMonth('prev')}
//                     style={styles.navButton}
//                 >
//                     <Feather name="chevron-left" size={20} color={textColor} />
//                 </TouchableOpacity>

//                 <Text style={[styles.monthYear, { color: textColor }]}>
//                     {monthNames[currentMonth]} {currentYear}
//                 </Text>

//                 <TouchableOpacity
//                     onPress={() => navigateMonth('next')}
//                     style={styles.navButton}
//                 >
//                     <Feather name="chevron-right" size={20} color={textColor} />
//                 </TouchableOpacity>
//             </View>

//             <View style={styles.dayHeaders}>
//                 {dayNames.map((dayName, index) => (
//                     <View key={`header-${index}-${dayName}`} style={styles.dayHeaderWrapper}>
//                         <Text style={[styles.dayHeader, { color: textColor }]}>
//                             {dayName}
//                         </Text>
//                     </View>
//                 ))}
//             </View>
//             {renderMonthView()}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         marginHorizontal: 20,
//         marginBottom: 16,
//         borderRadius: 12,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 20,
//         paddingVertical: 16,
//         borderBottomWidth: 1,
//     },
//     navButton: {
//         padding: 8,
//     },
//     monthYear: {
//         fontSize: 18,
//         fontWeight: '600',
//     },
//     dayHeaders: {
//         flexDirection: 'row',
//         paddingTop: 12,
//         paddingBottom: 8,
//         paddingHorizontal: 16,
//     },
//     dayHeaderWrapper: {
//         flex: 1,
//         alignItems: 'center',
//     },
//     dayHeader: {
//         fontSize: 12,
//         fontWeight: '600',
//         opacity: 0.7,
//     },
//     monthGrid: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         paddingHorizontal: 16,
//         paddingTop: 8,
//         paddingBottom: 16,
//     },
//     dayCellWrapper: {
//         width: '14.285714%', // Exactly 1/7
//         alignItems: 'center',
//         paddingVertical: 4,
//     },
//     dayCell: {
//         width: 40,
//         height: 40,
//         alignItems: 'center',
//         justifyContent: 'center',
//         borderRadius: 20, // Half of width/height for perfect circle
//     },
//     dayText: {
//         fontSize: 16,
//         fontWeight: '500',
//         textAlign: 'center',
//     },
//     weekendText: {
//         color: '#9CA3AF', // Gray color for weekends
//         opacity: 0.7,
//     },
//     todayCell: {
//         backgroundColor: '#3B82F6', // Blue background for today
//     },
//     todayText: {
//         color: '#FFFFFF',
//         fontWeight: '600',
//     },
//     selectedCell: {
//         backgroundColor: 'rgba(59, 130, 246, 0.2)', // Light blue background
//         borderWidth: 2,
//         borderColor: '#3B82F6',
//     },
//     selectedText: {
//         color: '#3B82F6',
//         fontWeight: '600',
//     },
//     availableCell: {
//         backgroundColor: 'rgba(29, 78, 216, 0.1)', // Light blue background
//         borderWidth: 2,
//         borderColor: '#1D4ED8',
//     },
//     availableText: {
//         color: '#1D4ED8',
//         fontWeight: '600',
//     },
//     unavailableCell: {
//         backgroundColor: 'rgba(220, 38, 38, 0.1)', // Light red background
//         borderWidth: 2,
//         borderColor: '#DC2626',
//     },
//     unavailableText: {
//         color: '#DC2626',
//         fontWeight: '600',
//     },
// });