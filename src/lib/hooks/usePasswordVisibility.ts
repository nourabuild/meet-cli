import { useState } from 'react';

interface UsePasswordVisibilityReturn {
    visible: boolean;
    toggleVisibility: () => void;
    inputType: "text" | "password";
}

/**
 * Custom hook for managing password visibility state
 * Eliminates duplicate state management across forms
 */
function usePasswordVisibility(initialVisible: boolean = false): UsePasswordVisibilityReturn {
    const [visible, setVisible] = useState(initialVisible);

    const toggleVisibility = () => {
        setVisible(prev => !prev);
    };

    return {
        visible,
        toggleVisibility,
        inputType: visible ? "text" : "password"
    };
}

export default usePasswordVisibility;
