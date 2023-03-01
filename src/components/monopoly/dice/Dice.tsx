import style from '../../../assets/css/dice.module.scss';

interface DicePropsType {
  num: number;
}

const Dice = (props: DicePropsType) => {
  const { num } = props;
  return <div className={style.dice}>{num}</div>;
};
export default Dice;
