import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface UsersAttributes {
  id: number;
  encodedId: string;
  access_token: string;
  refresh_token: string;
  created_at?: Date;
  updated_at?: Date;
  goal_calories?: number;
}

export type UsersPk = 'id';
export type UsersId = Users[UsersPk];
export type UsersOptionalAttributes =
  | 'created_at'
  | 'updated_at'
  | 'goal_calories';
export type UsersCreationAttributes = Optional<
  UsersAttributes,
  UsersOptionalAttributes
>;

export class Users
  extends Model<UsersAttributes, UsersCreationAttributes>
  implements UsersAttributes
{
  declare id: number;
  declare encodedId: string;
  declare access_token: string;
  declare refresh_token: string;
  declare created_at?: Date;
  declare updated_at?: Date;
  declare goal_calories?: number;

  static initModel(sequelize: Sequelize.Sequelize): typeof Users {
    return Users.init(
      {
        id: {
          type: DataTypes.BIGINT,
          allowNull: false,
          primaryKey: true,
        },
        encodedId: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        access_token: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        refresh_token: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        goal_calories: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 2000,
        },
      },
      {
        sequelize,
        tableName: 'users',
        timestamps: false,
        indexes: [
          {
            name: 'PRIMARY',
            unique: true,
            using: 'BTREE',
            fields: [{ name: 'id' }],
          },
        ],
      },
    );
  }
}
