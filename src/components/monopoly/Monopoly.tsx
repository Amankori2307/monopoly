import { useEffect, useRef } from "react";
import { connect } from "react-redux";
import style from "../../assets/css/monopoly.module.scss";
import sites from "../../assets/data/boardData.json";
import {
  calculateSitePositions,
  setBoardSize
} from "../../redux/actions/board";
import { setTotalPlayers } from "../../redux/actions/player";
import { setSites } from "../../redux/actions/site";
import Footer from "../home/footer/Footer";
import Header from "../home/header/Header";
import Board from "./board/Board";
import ModalWrapper from "./modal/ModalWrapper";

const Monopoly = ({
  setBoardSize,
  calculateSitePositions,
  setTotalPlayers,
  setSites,
}) => {
  const totalPlayers = 2;
  const isMounted = useRef(false);
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const boardSize = Math.min(w, h);
    const margin = boardSize > 600 ? 100 : 40;
    const boardData = {
      side: boardSize - margin,
      rowWidth: 120,
    };
    setBoardSize(boardData);
    calculateSitePositions(boardData);
    setTotalPlayers(totalPlayers);
    setSites([...sites]);
    isMounted.current = true;
  }, [setBoardSize, calculateSitePositions, setTotalPlayers, setSites]);

  return (
    <>
      {isMounted.current && (
        <div className={style.monopoly}>
          <Header />
          <Board />
          <ModalWrapper />
          <Footer />
        </div>
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    setBoardSize: (data) => dispatch(setBoardSize(data)),
    calculateSitePositions: (data) => dispatch(calculateSitePositions(data)),
    setTotalPlayers: (totalPlayers) => dispatch(setTotalPlayers(totalPlayers)),
    setSites: (data) => dispatch(setSites(data)),
  };
};

const mapStateToProps = (store) => {
  return {
    store,
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(Monopoly);
