import React from 'react'
import style from '../../../../assets/css/trade-card-modal.module.css'
import CardModal from '../CardModal'
import cardSelectedImage from '../../../../assets/images/card-selected2.png'

export default function CardListItem({cardData, listName, onSelect}) {
    return (
        <div className={style.cardWrapper} onClick={() => onSelect(cardData.site.id, listName)}>
            <CardModal  card={cardData.site} />
            {cardData.selected && <div className={style.overlay}>
                <img className={listName==="otherPlayer"?style.rotate:""}  src={cardSelectedImage} alt="card selcted"/>
            </div>}
        </div>
    )
}
