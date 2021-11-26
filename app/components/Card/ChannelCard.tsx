import { ChannelInfoModel } from '@/types/m3u';
import Image from 'next/image';
import styles from './ChannelCard.module.scss';

const Card = ({
  channel,
  toggleChannel,
}: {
  channel: ChannelInfoModel;
  toggleChannel: (channel: ChannelInfoModel) => void;
}) => {
  const { logo, name } = channel;
  const onclick = () => toggleChannel(channel);

  return (
    <div className={styles['card']} onClick={onclick}>
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
