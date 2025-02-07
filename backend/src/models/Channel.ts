import { Schema, model, Document, Types } from 'mongoose';

interface IChannelUser {
  user: Types.ObjectId;
  role: 'admin' | 'member';
}

interface IChannel extends Document {
  name: string;
  description?: string;
  members: IChannelUser[];
}

const ChannelSchema = new Schema<IChannel>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  members: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['admin', 'member'], required: true },
    },
  ],
});

const Channel = model<IChannel>('Channel', ChannelSchema);
export default Channel;

