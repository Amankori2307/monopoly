import { useDispatch } from 'react-redux';
import type { AppDispatch } from 'src/redux/store';

type DispatchFunc = () => AppDispatch;
const useAppDispatch: DispatchFunc = useDispatch;

export default useAppDispatch;
