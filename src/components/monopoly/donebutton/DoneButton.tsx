import { connect } from 'react-redux';
import style from '../../../assets/css/done-button.module.scss'
import { setActivePlayer } from '../../../redux/actions/player'
import { setIsDone } from '../../../redux/actions/board'

const DoneButton = ({ isDone, setActivePlayer, setIsDone }) => {
    const done = () => {
        if (isDone) {
            setActivePlayer();
            setIsDone(false);
        }
    }
    return (
        <button onClick={done} className={`${style.doneButton} ${!isDone ? style.inactive : ""}`}>Done</button>
    );
}

const mapStateToProps = (store) => {
    return {
        isDone: store.board.isDone
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        setActivePlayer: () => dispatch(setActivePlayer()),
        setIsDone: (isDone) => dispatch(setIsDone(isDone)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DoneButton)