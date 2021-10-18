import React from 'react'
import style from '../../../../assets/css/trade-card-modal.module.css'
import CardListItem from './CardListItem'
const CardList = ({cardList, listName, onSelect}) => {
    return (
        <div className={style.cardListContainer}>
            <div className={style.cardList}>
                {cardList.map(cardData => <CardListItem key={cardData.site.id} cardData={cardData} listName={listName} onSelect={onSelect}/>)}  
            </div>
            <p className={style.tradeInfo}>{listName==="otherPlayer"?"Asking":"Giving"} 0/{cardList.length} cards</p>
        </div>
    ) 
}

export default CardList