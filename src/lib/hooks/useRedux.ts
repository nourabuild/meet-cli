
import { ApplicationDispatch, ApplicationState } from '@/stores/store';
import { TypedUseSelectorHook, useSelector, useDispatch } from 'react-redux';

const useReduxSelector: TypedUseSelectorHook<ApplicationState> =
    useSelector;

const useReduxDispatch: () => ApplicationDispatch = useDispatch;

export {
    useReduxSelector,
    useReduxDispatch
}