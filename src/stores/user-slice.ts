
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Users } from "@/repo/users";

type SessionState = Users.User | null;

const initialState: SessionState = null;

const userSlice = createSlice({
    name: "user",
    initialState: initialState as SessionState,
    reducers: {
        setSession: (_, action: PayloadAction<Users.User>) => {
            return action.payload;
        },
        logout: () => {
            return null;
        }
    },
});

export const userReducer = userSlice.reducer;
export const { setSession, logout } = userSlice.actions;

export default userSlice;