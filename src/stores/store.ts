import { configureStore } from '@reduxjs/toolkit';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import logger from './logger';
import userSlice from "./user-slice";

const store = configureStore({
    reducer: {
        user: userSlice.reducer,
    },

    devTools: false, // RN Specific
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(devToolsEnhancer()), // RN Specific
});

export type ApplicationState = ReturnType<typeof store.getState>;
export type ApplicationDispatch = typeof store.dispatch;

export default store;