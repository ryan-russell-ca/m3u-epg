import { ChannelInfoModel } from '@/types/m3u';
import Image from 'next/image';
import styles from './ChannelCard.module.scss';

const Card = ({ channel }: { channel: ChannelInfoModel }) => {
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
    </div>
  );
};

export default Card;
