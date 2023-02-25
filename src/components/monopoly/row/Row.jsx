import React from 'react'
import style from '../../../assets/css/row.module.scss'
import CardWrapper from './CardWrapper';
import { connect } from 'react-redux'
const Row = ({ rowNum, data, boughtBy }) => {
    return (
        <div className={`${style.row} ${style["row" + rowNum]}`}>
            {data.map((data, index) => <CardWrapper key={index} data={data} rowNum={rowNum} boughtBy={boughtBy[data.id]} />)}
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        boughtBy: store.siteData.boughtBy
    }
}
export default connect(mapStateToProps)(Row);