import Inquirer from 'inquirer';
import { clearTerminal } from './Terminal';

const prompt = Inquirer.createPromptModule();

const Question = async (questions: Inquirer.QuestionCollection<any>, clear = true) => {
  if (clear) {
    clearTerminal();
  }

  return await prompt({
    prefix: '',
    ...questions,
  });
};

export default Question;
