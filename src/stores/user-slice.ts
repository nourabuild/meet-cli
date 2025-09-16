
import { createAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Users } from "@/repo/users";
import { REMEMBER_REHYDRATED, REMEMBER_PERSISTED } from 'redux-remember';

// type SessionState = Users.User | null;

// const initialState: SessionState = null;

type SessionState = {
    user: Users.User | null;
    isPersisted: boolean | null;
    isRehydrated: boolean | null;
};

const initialState: SessionState = {
    user: null,
    isPersisted: null,
    isRehydrated: null,
};

const userSlice = createSlice({
    name: "user",
    initialState: initialState as SessionState,
    reducers: {
        setSession: (state, action: PayloadAction<Users.User>) => {
            state.user = action.payload;
        },
        logout: (state) => {
            state.user = null;
        }
    },
    extraReducers: (builder) => builder
        .addCase(createAction(REMEMBER_REHYDRATED), (state, action: PayloadAction) => {
            // Guard against null state during early rehydration
            if (state === null) {
                return { ...initialState, isRehydrated: true } as SessionState;
            }
            state.isRehydrated = true;
        })
        .addCase(createAction(REMEMBER_PERSISTED), (state, action: PayloadAction) => {
            if (state === null) {
                return { ...initialState, isPersisted: true } as SessionState;
            }
            state.isPersisted = true;
        }),
});

export const userReducer = userSlice.reducer;
export const { setSession, logout } = userSlice.actions;

export default userSlice;


// --


// import { createAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
// import { Users } from "@/repo/users";
// import { REMEMBER_REHYDRATED, REMEMBER_PERSISTED } from 'redux-remember';

// type SessionState = {
//     user: Users.User | null;
//     isPersisted: boolean;
//     isRehydrated: boolean;
// };

// const initialState: SessionState = {
//     user: null,
//     isPersisted: false,
//     isRehydrated: false,
// };

// const userSlice = createSlice({
//     name: "user",
//     initialState: initialState as SessionState,
//     reducers: {
//         setSession: (state, action: PayloadAction<Users.User>) => {
//             state.user = action.payload;
//         },
//         logout: (state) => {
//             state.user = null;
//         }
//     },
//     extraReducers: (builder) => builder
//         .addCase(createAction(REMEMBER_REHYDRATED), (state, action: PayloadAction) => {
//             state.isRehydrated = true;
//         })
//         .addCase(createAction(REMEMBER_PERSISTED), (state, action: PayloadAction) => {
//             state.isPersisted = true;
//         }),
// });

// export const userReducer = userSlice.reducer;
// export const { setSession, logout } = userSlice.actions;

// export default userSlice;
