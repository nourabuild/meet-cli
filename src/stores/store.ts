import { configureStore } from '@reduxjs/toolkit';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import logger from './logger';
import userSlice from "./user-slice";
import themeSlice from './theme-slice';
import { rememberReducer, rememberEnhancer } from 'redux-remember';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rememberedKeys = ['user'];

const store = configureStore({
    reducer: rememberReducer({
        user: userSlice.reducer,
        theme: themeSlice.reducer,
    }),
    devTools: false, // RN Specific
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    enhancers: (getDefaultEnhancers) => getDefaultEnhancers()
        .concat(rememberEnhancer(
            AsyncStorage,
            rememberedKeys
        ))
        .concat(devToolsEnhancer())
});

export type ApplicationState = ReturnType<typeof store.getState>;
export type ApplicationDispatch = typeof store.dispatch;

export default store;


// const reducer = rememberReducer({
//     user: userSlice.reducer,
//     theme: themeSlice.reducer,
// });

// import { configureStore } from '@reduxjs/toolkit';
// import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
// import logger from './logger';
// import userSlice from "./user-slice";
// import themeSlice from './theme-slice';
// import { rememberEnhancer, rememberReducer } from 'redux-remember';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const rememberedKeys = ['user'];

// const persist = rememberReducer({
//     user: userSlice.reducer,
// });

// const store = configureStore({
//     reducer: rememberReducer({
//         user: persist,
//         theme: themeSlice.reducer,
//     }),

//     devTools: false, // RN Specific
//     middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
//     enhancers: (getDefaultEnhancers) =>
//         getDefaultEnhancers()
//             .concat(devToolsEnhancer())
//             .concat(rememberEnhancer(
//                 AsyncStorage,
//                 rememberedKeys,
//                 { persistWholeStore: true }
//             )),
// });

// export type ApplicationState = ReturnType<typeof store.getState>;
// export type ApplicationDispatch = typeof store.dispatch;

// export default store;
