import { Middleware } from "@reduxjs/toolkit";

const logger: Middleware = (_store) => (next) => (action) => {
    // console.log("dispatching", action);
    const result = next(action);
    // console.log("next state", store.getState());
    return result;
};

export default logger;
