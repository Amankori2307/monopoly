import React from 'react'
import style from '../../../assets/css/row.module.css'
import Card from './Card'
import {connect} from 'react-redux'
const Row = ({rowNum, data, boughtBy}) => {
    console.log("ROW "+rowNum)
    return (
        <div className={`${style.row} ${style["row"+rowNum]}`}>
            {data.map((data, index) => <Card key={index} data={data} rowNum={rowNum} soldTo={boughtBy[data.id]} />)}
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        boughtBy: store.siteData.boughtBy
    }
}
export default connect(mapStateToProps)(Row) ;