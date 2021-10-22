import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import styles from './Footer.module.css';
import Spacer from './Spacer';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Spacer size={1} axis="vertical" />
      <ThemeSwitcher />
    </footer>
  );
};

export default Footer;
