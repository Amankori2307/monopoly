import { initBoard } from '@monopoly/lib//core';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IState } from '../../redux/reducers/rootReducer';
import style from '../../assets/css/monopoly.module.scss';
import sites from '../../assets/data/boardData.json';
import { setTotalPlayers } from '../../redux/actions/player';
import { setSites } from '../../redux/actions/site';
import Footer from '../home/footer/Footer';
import Header from '../home/header/Header';
import Board from './board/Board';
import ModalWrapper from './modal/ModalWrapper';

const Monopoly = () => {
  const totalPlayers = 4;
  const isMounted = useRef(false);
  const dispatch = useDispatch();
  const isDone = useSelector((state:IState) => state.board.isDone);

  useEffect(() => {
    if (!isMounted.current) {
      dispatch(initBoard(600));
      dispatch(setTotalPlayers(totalPlayers));
      dispatch(setSites([...sites]));
      isMounted.current = true;
    }
  }, [dispatch, isDone]);

  return (
    <div className={style.monopoly}>
      {isMounted.current && (
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
