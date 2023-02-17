import style from '../../../../assets/css/card.module.scss'

const ChestOrChanceCard = ({ data, active }) => {
    const genClassList = () => {
        let classList = "";
        classList += style.card + " " + style.chest + " "
        classList += !active ? style.inactive + " " : ""
        return classList
    }

    return (
        <div className={genClassList()}>
            <p>{data.name}</p>
        </div>
    );
}
export default ChestOrChanceCard