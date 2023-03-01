import {
  BOARD_DATA,
  initBoard,
  setSites,
  setTotalPlayers,
} from '@monopoly/lib//core';
import { useEffect, useState } from 'react';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import style from '../../assets/css/monopoly.module.scss';
import Footer from '../home/footer/Footer';
import Header from '../home/header/Header';
import Board from './board/Board';
import ModalWrapper from './modal/ModalWrapper';

const Monopoly = () => {
  const totalPlayers = 4;
  const dispatch = useAppDispatch();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!isMounted) {
      dispatch(initBoard(600));
      dispatch(setTotalPlayers(totalPlayers));
      dispatch(setSites([...BOARD_DATA]));
      setIsMounted(true);
    }
  }, [dispatch, isMounted]);

  return (
    <div className={style.monopoly}>
      {isMounted && (
        <>
          <Header />
          <Board />
          <ModalWrapper />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Monopoly;
