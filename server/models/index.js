import sequelize from '../config/database.js';
import UserModel from './User.js';
import StepLogModel from './StepLog.js';
import RewardModel from './Reward.js';
import UserStepsModel from './UserSteps.js';

  // Initialize models
  const User = UserModel(sequelize);
  const StepLog = StepLogModel(sequelize);
  const Reward = RewardModel(sequelize);
  const UserSteps = UserStepsModel(sequelize);

  // Define relationships
  User.hasMany(StepLog, { foreignKey: 'userId' });
  StepLog.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Reward, { foreignKey: 'userId' });
  Reward.belongsTo(User, { foreignKey: 'userId' });

  // UserSteps relationships- user id to total steps
  User.hasOne(UserSteps, {
    foreignKey: 'userId',
    onDelete: 'CASCADE' // Remove step counter if user is deleted
  });
  UserSteps.belongsTo(User, {
    foreignKey: 'userId'
  });

  // Reward relationships
  User.hasMany(Reward, { 
    foreignKey: 'userId',
    onDelete: 'CASCADE' // Remove rewards if user is deleted
  });
  Reward.belongsTo(User, { 
    foreignKey: 'userId' 
  });
  
  export {
    sequelize,
    User,
    StepLog,
    Reward,
    UserSteps
  };