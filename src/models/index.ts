import { Model } from 'mongoose';
import Agent from './agent.model';
import Carrier from './carrier.model';
import LOB from './lob.model';
import User from './user.model';
import Account from './account.model';
import Policy from './policy.model';
import Message from './message.model';

export { Agent, Carrier, LOB, User, Account, Policy, Message };

// Ordered map used by the stats controller.
export const models: Record<string, Model<any>> = {
  Agent,
  Carrier,
  LOB,
  User,
  Account,
  Policy,
  Message,
};

export default models;
