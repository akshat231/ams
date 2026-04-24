import fs from 'fs'
import path from 'path'
import logger from '../../utils/logger'

const createConfig = (directory: string) => {
    try {
        logger.info('Creating standard config')
        const folderPath = path.join(directory, 'config');
        if(!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filePath = path.join(folderPath, 'ams.json');
        const jsonPath = path.join(__dirname, '../../utils/ams.json');
        fs.copyFileSync(jsonPath, filePath);
        logger.info('created file ams.json under config')
    } catch (error) {
        logger.error('Error occured in creating config file: ', error);
        throw error;
    }
}

export default createConfig