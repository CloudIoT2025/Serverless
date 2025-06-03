import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Users, UsersId } from './users';

export interface FitbitDataAttributes {
  id: string;
  user_id?: number;
  encoded_id?: string;
  calories_fitbit?: number;
  date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export type FitbitDataPk = 'id';
export type FitbitDataId = FitbitData[FitbitDataPk];
export type FitbitDataOptionalAttributes =
  | 'user_id'
  | 'encoded_id'
  | 'calories_fitbit'
  | 'date'
  | 'created_at'
  | 'updated_at';
export type FitbitDataCreationAttributes = Optional<
  FitbitDataAttributes,
  FitbitDataOptionalAttributes
>;

export class FitbitData
  extends Model<FitbitDataAttributes, FitbitDataCreationAttributes>
  implements FitbitDataAttributes
{
  declare id: string;
  declare user_id?: number;
  declare encoded_id?: string;
  declare calories_fitbit?: number;
  declare date?: Date;
  declare created_at?: Date;
  declare updated_at?: Date;

  // FitbitData belongsTo Users via user_id
  user!: Users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<Users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<Users, UsersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<Users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof FitbitData {
    return FitbitData.init(
      {
        id: {
          type: DataTypes.STRING(64),
          allowNull: false,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.BIGINT,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        encoded_id: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        calories_fitbit: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        date: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      {
        sequelize,
        tableName: 'fitbit_data',
        timestamps: false,
        indexes: [
          {
            name: 'PRIMARY',
            unique: true,
            using: 'BTREE',
            fields: [{ name: 'id' }],
          },
          {
            name: 'user_id',
            using: 'BTREE',
            fields: [{ name: 'user_id' }],
          },
        ],
      },
    );
  }
}
