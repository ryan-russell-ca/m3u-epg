import { ChannelInfoModel } from '@/types/m3u';
import Image from 'next/image';
import React from 'react';
import styles from './ChannelCard.module.scss';

const Card = ({
  channel,
  onRemove,
}: {
  channel: ChannelInfoModel;
  onRemove?: (channel: ChannelInfoModel) => void;
}) => {
  const { logo, name } = channel;

  return (
    <div className={styles['card']}>
      <div className={styles['card-header']}>
        {logo && logo !== 'null' ? (
          <Image src={logo} alt={name} layout="fill" objectFit="contain" />
        ) : null}
      </div>
      <div className={styles['card-body']}>
        <span className={styles['tag tag-teal']}>{name}</span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(channel)}
          className={styles['card-body-close']}
        >
          <div>
            <div />
            <div />
          </div>
        </button>
      )}
    </div>
  );
};

export default Card;
