import { connect, useDispatch } from 'react-redux';
import style from '../../../assets/css/done-button.module.scss'
import { setActivePlayer } from '../../../redux/actions/player'
import { setIsDone } from '@monopoly/lib//core'

const DoneButton = ({ isDone, setActivePlayer }) => {
    const dispatch = useDispatch()
    const done = () => {
        if (isDone) {
            setActivePlayer();
            dispatch(setIsDone(false));
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
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DoneButton)